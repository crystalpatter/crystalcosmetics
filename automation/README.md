# Crystal Cosmetics AI Improvement Agent

Runs automatically 3x/day via `.github/workflows/ai-improve.yml` (also
runnable manually from the GitHub Actions tab -> "Crystal Cosmetics AI
Improvement Agent" -> "Run workflow").

## How it works

Every run:

1. Updates `sitemap.xml` `<lastmod>` dates from real git history (not a
   fake daily bump).
2. Asks Claude to look at a curated set of live pages and propose small,
   verifiable edits, each pre-classified as **auto** or **review**
   (see the safety model in `lib/ai-agent.js`).
3. **Auto-tier** edits (missing alt text, broken internal links, verbatim
   structured data) are applied and pushed straight to `main`.
4. **Review-tier** edits (anything touching customer-facing wording,
   pricing, claims, or CTAs) are applied on a single rolling branch,
   `ai-review/YYYY-MM-DD`, and opened/updated as one GitHub Pull Request
   for that day. Nothing in this PR goes live until someone merges it.

A regex safety net force-downgrades anything auto-tagged that looks like a
price, phone number, address, or claim-y language ("guarantee", "cure",
etc.) into the review tier, regardless of how the model classified it.

## One-time setup (do this before the first scheduled run)

1. **Add the Anthropic API key as a repo secret** - Settings -> Secrets
   and variables -> Actions -> New repository secret -> name it
   `ANTHROPIC_API_KEY`. (Do this yourself - don't paste API keys through
   an assistant or any third party.)
2. **Add Crystal as a collaborator** with at least Write access (Settings
   -> Collaborators) so she gets emailed when the daily review PR opens
   and can merge it herself with one click. Alternatively add her as a
   requested reviewer on the PR each day.
3. **Test it manually first**: Actions tab -> this workflow -> "Run
   workflow", then check the run log and, if a PR opened, read it before
   trusting the schedule.

## Changing what it's allowed to touch

Edit `CANDIDATE_FILES` in `scripts/run-ai-agent.mjs` to add/remove pages,
and `TIER_RULES` / `FORCE_REVIEW_PATTERNS` in `lib/ai-agent.js` to change
what counts as safe-enough-to-auto-ship. When in doubt, keep things in the
review tier - it costs one click, not much friction.
