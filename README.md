# Crystal Cosmetics — Static Site Rebuild

A full, framework-free HTML/CSS site rebuilding crystalcosmetics.com.au off Shopify,
ready for GitHub + your GoDaddy domain. No build step — every page is plain HTML/CSS/JS.

## Structure

```
index.html                  Home
about.html
contact.html
services/
  cosmetic-tattooing.html
  collagen-induction-therapy.html
  lashes-and-brows.html
training/
  index.html
  1-1-lip-tattooing-training.html
  online-lip-tattooing-masterclass.html
shop/
  index.html                All collections
  skin.html, face-tools.html, lips.html, pmu.html, disposables.html,
  brushes.html, lights.html, mapping-and-marking.html, practice-skin.html,
  skin-prep-and-aftercare.html
blog/
  index.html
  lip-blushing-reviews-was-it-worth-it.html
  how-long-does-cosmetic-tattoo-last.html
  what-is-lip-blushing-tattoo.html
policies/
  privacy-policy.html, refund-policy.html, shipping-policy.html, terms-of-service.html
css/style.css                Shared stylesheet — one source of truth for the whole site
js/main.js                   Shared behaviour: hero slideshow, scroll reveal, FAQ accordion
images/                       Empty — drop real photos in here (see below)
```

Every page shares the same nav + footer (generated from `build.py`, `build_core.py`,
`build_services.py`, `build_training.py`, `build_shop.py`, `build_blog.py`,
`build_policies.py`). If you want to change the nav or footer site-wide later,
edit `build.py` and re-run the build scripts rather than hand-editing every page.

## 1. Swapping in real photos

Every image slot is currently a styled colour placeholder (a `<div class="ph ph-xxx">`)
so the site is fully navigable and on-brand without real photography yet.

To swap a placeholder for a real photo:
1. Drop the photo into `/images/` (subfolders already created: hero, services,
   training, products, blog, icons, logo).
2. In the relevant `.ph-xxx` class in `css/style.css`, replace the gradient with:
   ```css
   .ph-hero1 { background-image: url('/images/hero/hero-1.jpg'); }
   ```
   Because every placeholder is a CSS class, this is a **find-and-replace job in
   one file** — you don't need to touch each HTML page individually.
3. For product photos in the Shop section, each product card in `shop/*.html`
   currently uses one of four repeating placeholder classes
   (`ph-prod1`–`ph-prod4`) — once you send a real product photo export, I can
   wire each product to its own unique image and real name/price rather than
   the shared placeholders.

**Fastest way to get me your real photos:** export them from Shopify admin
(Settings → Files, or Products → Export) or zip your original files, and send
the zip back in this chat. I'll drop each one into its exact slot.

## 2. Checkout / cart — decision needed

This rebuild has **no cart or checkout system yet** — Shopify's checkout isn't
being replicated because it can't run on static GoDaddy hosting without a
backend. Shop pages currently link to Contact so orders can be taken manually
in the meantime. Given services are the main revenue line, reasonable options:

- **Snipcart** or **Shopify Buy Button** (lightweight, drop-in JS cart) — a few
  lines added to `shop/*.html`, no rebuild needed.
- **Stripe Payment Links** per product — simplest, no cart, just "Buy Now" buttons.
- Keep it enquiry-only, as it is now, since services are the priority.

Tell me which direction you want and I'll wire it in.

## 3. Contact form + newsletter form

Both forms currently show a placeholder alert (`data-noop` in `js/main.js`) —
GitHub Pages / GoDaddy static hosting can't process form submissions on their
own. Wire one of these in before going live:
- [Formspree](https://formspree.io) — easiest, free tier available, just change the `<form>` `action`.
- GoDaddy's own website form-to-email tool, if hosting through their builder.
- A simple `mailto:` fallback (lowest effort, opens the visitor's email client).

## 4. Product catalogue

The 10 shop collections are all scaffolded with the correct names, descriptions
and page structure, but only the Disposables collection has real products
seeded in (from what was visible on the current homepage). The rest use
repeating placeholder cards. Once you send your product export (name, price,
photo per item — a CSV or the Shopify product export works great), I'll
populate every collection with real product cards and individual product pages.

## 5. Deploying

1. Push this whole folder to a GitHub repo.
2. Enable **GitHub Pages** (Settings → Pages → deploy from branch) if you want
   a free GitHub-hosted preview, **or**
3. Point your GoDaddy domain's DNS / hosting at wherever this folder is
   uploaded (GoDaddy file manager, or GitHub Pages with a custom domain — up
   to you).
4. No build tools, no `npm install` — it's plain files, so any static host works.

## 6. Legal pages

Privacy, Refund, Shipping and Terms pages are drafted from scratch to fit this
business — they are a reasonable starting point but **haven't been reviewed by
a lawyer**. Worth a quick legal check before this goes live, especially the
Terms of Service and health-disclosure clause.

## 7. Pricing shown on the site

The Online Masterclass price ($450) and 1:1 Training price ($1,100) reflect
figures used in earlier drafts — please confirm both are still current before
launch, along with any shop pricing once the real catalogue goes in.
