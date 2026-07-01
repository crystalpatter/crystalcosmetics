#!/usr/bin/env node
/**
 * automation/scripts/run-ai-agent.mjs
 * Orchestrates one run of the Crystal Cosmetics AI Improvement Agent.
 *
 *  1. Updates sitemap.xml <lastmod> values from REAL git commit history
 *     (not a fake daily bump - this is deterministic, not model-driven).
 *  2. Reads a curated set of live site files.
 *  3. Asks the agent (lib/ai-agent.js) to propose edits, pre-sorted into
 *     "auto" (safe, ships immediately) and "review" (queued for approval).
 *  4. Applies AUTO edits to the working tree (a later workflow step commits
 *     + pushes these straight to main).
 *  5. Writes REVIEW edits to automation/.tmp-review-edits.json, which
 *     scripts/update-review-pr.mjs picks up in the next workflow step to
 *     build/update the daily review branch + PR.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { runImprovementAgent } from '../lib/ai-agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CANDIDATE_FILES = [
  'index.html',
  'about.html',
  'contact.html',
  'services/cosmetic-tattooing.html',
  'training/index.html',
  'shop/index.html',
  'blog/index.html',
];

function updateSitemapLastmod() {
  const candidates = ['public/sitemap.xml', 'sitemap.xml'];
  const relTarget = candidates.find((p) => existsSync(path.join(REPO_ROOT, p)));
  if (!relTarget) {
    console.log('[runner] No sitemap.xml found - skipping lastmod update.');
    return;
  }
  const target = path.join(REPO_ROOT, relTarget);
  const urlToFile = {
    '/': 'index.html',
    '/about.html': 'about.html',
    '/contact.html': 'contact.html',
    '/services/cosmetic-tattooing.html': 'services/cosmetic-tattooing.html',
    '/training/index.html': 'training/index.html',
    '/shop/index.html': 'shop/index.html',
    '/blog/index.html': 'blog/index.html',
  };

  let xml = readFileSync(target, 'utf8');
  let changed = false;

  for (const [urlPath, relFile] of Object.entries(urlToFile)) {
    const fileFull = path.join(REPO_ROOT, relFile);
    if (!existsSync(fileFull)) continue;
    let lastCommitDate;
    try {
      lastCommitDate = execSync(`git log -1 --format=%cs -- "${relFile}"`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    } catch {
      continue;
    }
    if (!lastCommitDate) continue;

    const escaped = urlPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locRe = new RegExp(`(<loc>[^<]*${escaped}</loc>\\s*<lastmod>)[^<]*(</lastmod>)`);
    if (locRe.test(xml)) {
      const updated = xml.replace(locRe, `$1${lastCommitDate}$2`);
      if (updated !== xml) { xml = updated; changed = true; }
    }
  }

  if (changed) {
    writeFileSync(target, xml, 'utf8');
    console.log('[runner] Updated sitemap.xml <lastmod> values from real git history.');
  } else {
    console.log('[runner] sitemap.xml already up to date.');
  }
}

function loadFiles() {
  return CANDIDATE_FILES
    .map((rel) => ({ rel, full: path.join(REPO_ROOT, rel) }))
    .filter((f) => existsSync(f.full))
    .map((f) => ({ path: f.rel, content: readFileSync(f.full, 'utf8') }));
}

function applyEdit(edit) {
  const full = path.join(REPO_ROOT, edit.file);
  if (!existsSync(full)) {
    console.warn(`[runner] Skipping edit - file not found: ${edit.file}`);
    return false;
  }
  const content = readFileSync(full, 'utf8');
  const occurrences = content.split(edit.search).length - 1;
  if (occurrences !== 1) {
    console.warn(`[runner] Skipping edit - search string not found exactly once (${occurrences}x) in ${edit.file}: ${edit.reason}`);
    return false;
  }
  writeFileSync(full, content.replace(edit.search, edit.replace), 'utf8');
  console.log(`[runner] Applied AUTO edit to ${edit.file}: ${edit.reason}`);
  return true;
}

async function main() {
  console.log('[runner] Crystal Cosmetics AI Improvement Agent starting...', new Date().toISOString());

  updateSitemapLastmod();

  const files = loadFiles();
  if (files.length === 0) {
    console.warn('[runner] No candidate files found - aborting.');
    return;
  }

  const { auto, review } = await runImprovementAgent(files);
  console.log(`[runner] Agent proposed ${auto.length} auto edit(s), ${review.length} review edit(s).`);

  let appliedCount = 0;
  for (const edit of auto) {
    if (applyEdit(edit)) appliedCount++;
  }
  console.log(`[runner] Applied ${appliedCount}/${auto.length} auto edits.`);

  const tmpQueuePath = path.join(__dirname, '..', '.tmp-review-edits.json');
  writeFileSync(tmpQueuePath, JSON.stringify(review, null, 2), 'utf8');
  console.log(`[runner] Wrote ${review.length} review edit(s) to .tmp-review-edits.json.`);
}

main().catch((err) => {
  console.error('[runner] Fatal error:', err);
  process.exit(1);
});
