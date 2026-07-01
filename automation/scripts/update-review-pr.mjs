#!/usr/bin/env node
/**
 * automation/scripts/update-review-pr.mjs
 * Takes whatever run-ai-agent.mjs just wrote to .tmp-review-edits.json and
 * applies it on a dedicated daily branch (ai-review/YYYY-MM-DD), then opens
 * or updates a single PR against main via the GitHub CLI.
 *
 * This stays separate from run-ai-agent.mjs so AUTO edits can be committed
 * straight to main while REVIEW edits stay isolated on their own branch
 * until Crystal approves the PR. Across the day's 3 runs, this branch
 * accumulates - it is only ever reset when a new day starts - so Crystal
 * gets ONE PR per day covering everything proposed that day, not three.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { formatPRDescription } from '../lib/ai-agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const tmpQueuePath = path.join(__dirname, '..', '.tmp-review-edits.json');
const logRelPath = 'automation/review-queue/log.json';

function sh(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe', encoding: 'utf8' });
}

function applyEdit(edit) {
  const full = path.join(REPO_ROOT, edit.file);
  if (!existsSync(full)) return false;
  const content = readFileSync(full, 'utf8');
  if (content.split(edit.search).length - 1 !== 1) return false;
  writeFileSync(full, content.replace(edit.search, edit.replace), 'utf8');
  return true;
}

async function main() {
  if (!existsSync(tmpQueuePath)) {
    console.log('[review-pr] No review edits from this run - nothing to do.');
    return;
  }
  const newEdits = JSON.parse(readFileSync(tmpQueuePath, 'utf8'));
  if (newEdits.length === 0) {
    console.log('[review-pr] Review edit list is empty - nothing to do.');
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const branch = `ai-review/${dateStr}`;

  sh('git fetch origin main');
  try {
    sh(`git fetch origin ${branch}`);
    sh(`git checkout -B ${branch} origin/${branch}`);
    console.log(`[review-pr] Continuing existing branch ${branch}.`);
  } catch {
    sh(`git checkout -b ${branch} origin/main`);
    console.log(`[review-pr] Created new branch ${branch} from main.`);
  }

  const logFull = path.join(REPO_ROOT, logRelPath);
  let log = [];
  if (existsSync(logFull)) {
    try { log = JSON.parse(readFileSync(logFull, 'utf8')); } catch { log = []; }
  }

  let appliedCount = 0;
  for (const edit of newEdits) {
    if (applyEdit(edit)) {
      appliedCount++;
      log.push({ file: edit.file, reason: edit.reason, category: edit.category || 'other' });
    } else {
      console.warn(`[review-pr] Could not apply (search not unique/found): ${edit.file} - ${edit.reason}`);
    }
  }

  if (appliedCount === 0) {
    console.log('[review-pr] No edits applied this run - leaving branch as-is.');
    return;
  }

  mkdirSync(path.dirname(logFull), { recursive: true });
  writeFileSync(logFull, JSON.stringify(log, null, 2), 'utf8');

  sh('git add -A');
  sh(`git -c user.name="Crystal Cosmetics AI Agent" -c user.email="ai-agent@crystalcosmetics.vercel.app" commit -m "AI proposed content changes - ${new Date().toISOString()}"`);
  sh(`git push --force-with-lease origin ${branch}`);

  const body = formatPRDescription(log, dateStr);
  const bodyFile = path.join(__dirname, '..', '.tmp-pr-body.md');
  writeFileSync(bodyFile, body, 'utf8');

  let existingPr = '';
  try {
    existingPr = sh(`gh pr list --head ${branch} --json number --jq ".[0].number"`).trim();
  } catch { existingPr = ''; }

  if (existingPr) {
    sh(`gh pr edit ${existingPr} --body-file "${bodyFile}"`);
    console.log(`[review-pr] Updated PR #${existingPr} (${appliedCount} new edit(s), ${log.length} total today).`);
  } else {
    sh(`gh pr create --base main --head ${branch} --title "Proposed content changes - ${dateStr}" --body-file "${bodyFile}"`);
    console.log(`[review-pr] Opened new PR (${appliedCount} edit(s)).`);
  }
}

main().catch((err) => {
  console.error('[review-pr] Fatal error:', err);
  process.exit(1);
});
