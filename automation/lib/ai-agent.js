/**
 * automation/lib/ai-agent.js - Crystal Cosmetics AI Improvement Agent (the "brain")
 *
 * Reads a curated set of live site files and asks Claude to propose concrete,
 * verifiable improvements. Every proposal must be a literal search/replace
 * pair against an existing file - no freeform rewrites, nothing invented.
 *
 * SAFETY MODEL - read this before changing TIER_RULES:
 *  - AUTO tier changes commit straight to main. They must be 100% mechanical
 *    and verifiable: nothing here may add or alter a claim, price, address,
 *    or phone number, or any fact not already present verbatim elsewhere in
 *    the provided file excerpts.
 *  - REVIEW tier changes are queued into a single rolling daily PR that
 *    Crystal approves with one click. Anything that touches customer-facing
 *    wording, claims, pricing, or CTAs belongs here.
 *  - A regex safety net (FORCE_REVIEW_PATTERNS) downgrades any AUTO proposal
 *    that contains a dollar amount, phone number, street address, or
 *    claim-shaped language to REVIEW, regardless of what the model tags it
 *    as. Do not remove this without a good reason.
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const SITE_CONTEXT = `
Crystal Cosmetics is a cosmetic tattooing & beauty studio on the Gold Coast,
Australia (brand line: "Nude by Crystal"). Services include lip blushing,
powder brows, cosmetic tattooing, collagen induction therapy / microneedling,
lash lift & tint, brow lamination, and 1:1 practitioner training. It also
sells a skincare/aftercare product range. The site is a static HTML/CSS/JS
site (no framework) deployed on Vercel. Tone: warm, professional,
premium-but-approachable beauty studio - never medical-claim language (no
"cures", no guaranteed results, no comparative safety claims). Audience:
Gold Coast local clients researching cosmetic tattooing, and prospective
trainees researching the training course.
`.trim();

export const TIER_RULES = `
Classify every proposed change as "auto" or "review":

AUTO (ships immediately, no human review) - allowed ONLY for:
  - missing or generic <img alt> text / ARIA labels, written using ONLY
    wording that already appears elsewhere on the same page (e.g. the
    section heading or service name) - never invented descriptive claims.
  - fixing an internal link that points to a page which doesn't exist, when
    there is an unambiguous, exact-name matching page elsewhere in the file set.
  - structured data (schema.org) fields, but ONLY values that appear
    verbatim in the provided file excerpts. Never infer or normalize them.

REVIEW (queued for Crystal's one-tap approval, does not go live automatically):
  - anything that changes customer-facing wording: headlines, service
    descriptions, CTAs, meta titles/descriptions, FAQ content, blog drafts.
  - anything mentioning price, currency, business hours, address, or phone
    number, even if just reformatting.
  - anything that could be read as a claim about results, safety, or outcomes.

If unsure which tier something belongs in, use "review". When in doubt about
whether a change is even correct, do not propose it at all.
`.trim();

const SYSTEM_PROMPT = `You are the improvement agent for a small business's
live website. You propose small, concrete, verifiable edits - never a
rewrite of a whole page, never invented facts. Every edit you propose must
be a literal "search" string that appears EXACTLY ONCE in the given file,
and a "replace" string to swap it with. If you cannot find an exact, unique
anchor for a change, do not propose it.

${SITE_CONTEXT}

${TIER_RULES}

Respond with ONLY a JSON object of this shape, no prose, no markdown fences:
{
  "auto": [
    { "file": "relative/path.html", "search": "...", "replace": "...", "reason": "one sentence" }
  ],
  "review": [
    { "file": "relative/path.html", "search": "...", "replace": "...", "reason": "one sentence", "category": "meta_copy|service_copy|faq_content|blog_draft|cta_copy" }
  ]
}
Propose at most 3 "auto" and 3 "review" edits per run. Quality over
quantity - skip anything you are not fully confident is correct.`;

const FORCE_REVIEW_PATTERNS = [
  /\$\s?\d/,
  /\b\d{2,4}[- ]?\d{3,4}[- ]?\d{3,4}\b/,
  /\b\d{1,4}\s+[A-Z][a-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Parade|Pde|Drive|Dr|Court|Ct|Highway|Hwy)\b/i,
  /\bguarantee|cure|permanent(ly)?\s+(fix|remove)|risk[- ]?free\b/i,
];

function forceReviewIfSensitive(edit) {
  const text = `${edit.search}\n${edit.replace}`;
  return FORCE_REVIEW_PATTERNS.some((re) => re.test(text));
}

export async function runImprovementAgent(files) {
  const fileBlock = files
    .map((f) => `----- FILE: ${f.path} -----\n${f.content}`)
    .join('\n\n');

  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here are the current site files. Propose improvements per the rules above.\n\n${fileBlock}`,
      },
    ],
  });

  const raw = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    console.warn('[ai-agent] Could not parse model output as JSON:', err.message);
    return { auto: [], review: [] };
  }

  const auto = [];
  const review = [...(parsed.review || [])];

  for (const edit of parsed.auto || []) {
    if (forceReviewIfSensitive(edit)) {
      console.warn(`[ai-agent] Downgrading "${edit.file}" edit to REVIEW (matched safety pattern): ${edit.reason}`);
      review.push({ ...edit, category: edit.category || 'safety_downgrade' });
    } else {
      auto.push(edit);
    }
  }

  return { auto, review };
}

export function formatPRDescription(reviewEdits, dateStr) {
  if (reviewEdits.length === 0) {
    return `No proposed content changes for ${dateStr}.`;
  }
  const byCategory = {};
  for (const e of reviewEdits) {
    const cat = e.category || 'other';
    (byCategory[cat] = byCategory[cat] || []).push(e);
  }
  const labels = {
    meta_copy: 'Page titles & search descriptions',
    service_copy: 'Service page wording',
    faq_content: 'New FAQ content',
    blog_draft: 'Blog post drafts',
    cta_copy: 'Call-to-action wording',
    safety_downgrade: 'Flagged for review (touches price/contact/claim language)',
    other: 'Other proposed changes',
  };
  let body = `## Proposed website changes - ${dateStr}\n\n`;
  body += `These were generated automatically. Nothing here is live yet - merge this PR to publish, or close it to discard.\n\n`;
  for (const [cat, edits] of Object.entries(byCategory)) {
    body += `### ${labels[cat] || cat}\n`;
    for (const e of edits) {
      body += `- **${e.file}**: ${e.reason}\n`;
    }
    body += '\n';
  }
  return body;
}
