/**
 * api/chat.js - Crystal Cosmetics on-site AI assistant
 *
 * Vercel serverless function (CommonJS, no framework required). Answers
 * visitor questions grounded in SITE_FACTS below and, when a visitor is
 * ready to book, tells the frontend which service to point them at so it
 * can surface a "Book Now" button linking to Crystal's real Timely booking
 * page. This function never creates a booking itself - Timely's own
 * booking flow is the single source of truth for the calendar, so there is
 * no way for a chat bug to double-book or misbook a real client.
 */
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BOOKING_URL = 'https://bookings.gettimely.com/crystalcosmetics/bb/book';

// Facts pulled directly from the live site (index.html, contact.html,
// services/cosmetic-tattooing.html, training/index.html) on 2026-07-02.
// Keep this in sync by hand when real content changes - the assistant is
// instructed to use ONLY what's written here, nothing invented.
const SITE_FACTS = `
BUSINESS: Crystal Cosmetics ("Nude by Crystal"), Gold Coast, Queensland, Australia.
Studio address: 5b/201 Varsity Parade, Varsity Lakes, QLD 4227.
Phone: 0499 453 555. Email: info@crystalcosmetics.com.au.
Online booking: ${BOOKING_URL}
Founder: Crystal - cosmetic tattoo artist, lip blushing specialist, trainer & mentor.
10+ years experience, 500+ clients, 5-star rated.

SERVICES (cosmetic tattooing):
- Lip Blushing: soft, natural-looking tint that enhances shape and colour, staying power vs. lipstick top-ups. Typically lasts 2-5 years depending on lifestyle/skin type; touch-up usually recommended every 12-18 months.
- Powder Brows: soft, natural fuller brow shape, pigment placed in fine hair-like strokes. Usually lasts 1-3 years depending on skin type/lifestyle.
- Eyeliner & Lash Enhancement: precise, defined eyes, no daily eyeliner or smudging.
- Collagen Induction Therapy (CIT) / skin needling.
- Lashes & Brows: lash lift & tint, brow lamination.

WHAT TO EXPECT (cosmetic tattooing procedures):
1. Consultation - discuss preferred shape and a colour that complements natural skin tone.
2. Procedure - pigment matched to skin undertone and natural colouring; technique suited to the client.
3. Comfort - a topical anaesthetic is used throughout; most clients describe a light scratching sensation, not pain; minimal discomfort and virtually no scabbing during healing.
4. Follow-up - around 4-6 weeks later, Crystal revisits the result, refines shape and tops up pigment where needed.
Lips are generally fully healed within 7-10 days.
Pre-appointment prep: eat beforehand (keep blood sugar stable); avoid alcohol for 24 hours before; avoid blood thinners (ibuprofen, aspirin, fish oil) which can increase bleeding risk; come in sun-safe and avoid recent waxing near the treatment area.

TRAINING (Crystal's Academy):
- 1:1 Lip Tattooing Training: in-person, Gold Coast, three-day hands-on intensive, all levels welcome. Price: $3,300.
- Introduction to Lip Blushing (Online Lip Tattooing Masterclass): online, self-paced, beginner to intermediate, 6 months of support included. Price: $450.

SHOP (Nude by Crystal - skincare, PMU supplies, beauty tools):
Example products: Micro-needle Derma Roller 0.30mm $44, Beauty Bar $68, Platinum Cryotherapy Facial Set $98, Platinum Contour Roller $72.
Categories: PMU Accessories, Lips, Beauty Disposables, Skin Care, Mapping & Marking, Lights.
Shipping: within Australia only. Orders processed 1-2 business days; delivery typically 3-10 business days depending on location. (The site shows a "free shipping over $80" promo banner on some pages and a "free over $100" answer on the Contact FAQ - if asked the exact free-shipping threshold, say it may vary/be promotional and suggest checking the cart at checkout, rather than picking one number confidently.)
Returns: unopened, unused products can be returned within 14 days of receipt; return shipping is covered by the customer.
Gift cards: available, redeemable against both products and services.
`.trim();

const SYSTEM_PROMPT = `You are the friendly on-site assistant for Crystal Cosmetics, a cosmetic tattooing and beauty studio on the Gold Coast, Australia. You help website visitors with questions and with finding the right service to book.

Ground every factual claim - prices, durations, addresses, policies, what a procedure involves - in the SITE_FACTS block below. Never invent or guess a price, timeframe, or policy that isn't in SITE_FACTS. If someone asks something not covered there, say you're not certain and suggest they call ${`0499 453 555`}, email info@crystalcosmetics.com.au, or ask during a consultation - do not guess.

You are not a medical professional. Do not give medical advice, contraindication guidance (e.g. medications, pregnancy, skin conditions, allergies), or safety guarantees beyond what is written in SITE_FACTS. For anything health-related, tell the person to discuss it directly with Crystal at consultation or by phone, and do not speculate.

Keep replies warm, concise, and conversational - usually 2-4 sentences, more only if genuinely needed. Do not use markdown headers or bullet-heavy formatting; write like a helpful person texting back.

When the visitor is ready to book, or directly asks how to book, name the specific service you're recommending and end your reply on its own final line with exactly: [BOOK: Service Name] - using one of these exact service names: Lip Blushing, Powder Brows, Eyeliner & Lash Enhancement, Collagen Induction Therapy, Lashes & Brows, 1:1 Lip Tattooing Training, Introduction to Lip Blushing. Only include this tag when booking is actually the next step - not for general browsing questions.

SITE_FACTS:
${SITE_FACTS}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Assistant is not configured yet.' });
    return;
  }

  try {
    const body = req.body || {};
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    if (incoming.length === 0) {
      res.status(400).json({ error: 'messages required' });
      return;
    }

    // Keep the request small and bounded regardless of client input.
    const messages = incoming.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000),
    }));

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const bookMatch = raw.match(/\[BOOK:\s*([^\]]+)\]/i);
    const bookService = bookMatch ? bookMatch[1].trim() : null;
    const reply = raw.replace(/\[BOOK:\s*[^\]]+\]/i, '').trim();

    res.status(200).json({
      reply,
      bookService,
      bookingUrl: bookService ? BOOKING_URL : null,
    });
  } catch (err) {
    console.error('[api/chat] error:', err);
    res.status(500).json({
      error: "Sorry, something went wrong on my end. Please try again, or reach us directly at 0499 453 555 / info@crystalcosmetics.com.au.",
    });
  }
};
