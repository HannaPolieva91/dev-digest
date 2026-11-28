#!/usr/bin/env node
// pr-self-review — collect the local diff and group it into buckets.
// Usage (from repo root): node .claude/skills/pr-self-review/scripts/collect-diff.mjs [--base <ref>]
// Output: JSON on stdout. Read-only: never writes to the repo or the git index.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const LARGE_BUCKET_LINES = 400;

const args = process.argv.slice(2);
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
if (args.includes('--base') && (!baseArg || baseArg.startsWith('-') || !/^[\w./@^~-]+$/.test(baseArg))) {
  console.log(JSON.stringify({ error: `invalid --base value: ${JSON.stringify(baseArg ?? null)}` }));
  process.exit(2);
}

const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' }; // never touch .git/index.lock
const git = (...a) =>
  execFileSync('git', a, { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 }).replace(/\n$/, '');
const tryGit = (...a) => {
  try { return git(...a); } catch { return null; }
};

const repoRoot = tryGit('rev-parse', '--show-toplevel');
if (!repoRoot) {
  console.log(JSON.stringify({ error: 'not a git repository' }));
  process.exit(2);
}
process.chdir(repoRoot);

// ---- base & merge-base -----------------------------------------------------
const candidates = [baseArg, 'origin/main', 'main', 'origin/master', 'master'].filter(Boolean);
const base = candidates.find((c) => tryGit('rev-parse', '--verify', '--quiet', `${c}^{commit}`));
if (!base) {
  console.log(JSON.stringify({ error: `no base found (tried ${candidates.join(', ')})` }));
  process.exit(2);
}
const notes = [];
if (baseArg && base !== baseArg) notes.push(`base "${baseArg}" not found, fell back to ${base}`);
const mergeBase = tryGit('merge-base', base, 'HEAD');
if (!mergeBase) {
  console.log(JSON.stringify({ error: `no merge-base between ${base} and HEAD` }));
  process.exit(2);
}
const head = git('rev-parse', 'HEAD');
const branch = tryGit('branch', '--show-current') || '(detached)';

// ---- classification --------------------------------------------------------
const SKIP = [
  [/(^|\/)node_modules\//, 'node_modules'],
  [/^server\/clones\//, 'clones'],
  [/(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/, 'lockfile'],
  [/(^|\/)(\.next|dist|coverage)\//, 'generated'],
  [/\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|mp4)$/i, 'binary'],
];
const CONTRACTS = /^(client|server)\/src\/vendor\/shared\//;

// Buckets that get a review subagent. docs/config/other are listed but not reviewed.
export const REVIEW_BUCKETS = ['ui', 'i18n', 'backend', 'persistence', 'domain', 'contracts', 'skills'];

function bucketOf(p) {
  for (const [re, why] of SKIP) if (re.test(p)) return { bucket: null, skip: why };
  if (p.startsWith('.claude/skills/')) return { bucket: 'skills' };
  if (/\.md$/i.test(p)) return { bucket: 'docs' };
  if (CONTRACTS.test(p)) return { bucket: 'contracts' };
  if (/\/vendor\//.test(p)) return { bucket: null, skip: 'vendor' };
  if (p.startsWith('client/messages/')) return { bucket: 'i18n' };
  if (p.startsWith('client/src/')) return { bucket: 'ui' };
  if (p.startsWith('server/src/db/migrations/')) return { bucket: 'migrations' };
  if (p.startsWith('server/src/db/')) return { bucket: 'persistence' };
  if (p.startsWith('server/src/') || p.startsWith('server/test/')) return { bucket: 'backend' };
  if (p.startsWith('reviewer-core/src/') || p.startsWith('reviewer-core/test/')) return { bucket: 'domain' };
  if (/^(client|server|reviewer-core)\//.test(p)) return { bucket: 'config' };
  return { bucket: 'other' };
}

const packageOf = (p) =>
  p.startsWith('client/') ? 'client' : p.startsWith('server/') ? 'server' : p.startsWith('reviewer-core/') ? 'reviewer-core' : null;

// ---- changed files ---------------------------------------------------------
// Working tree vs merge-base = committed-on-branch + staged + unstaged.
const files = [];
// -z: NUL-separated, no quoting — safe for spaces and non-ASCII paths.
const ns = git('diff', '--name-status', '-z', '-M', mergeBase).split('\0').filter((x) => x !== '');
for (let i = 0; i < ns.length; ) {
  const code = ns[i++][0]; // A M D R C T
  if (code === 'R' || code === 'C') {
    const oldPath = ns[i++];
    const path = ns[i++];
    files.push({ path, oldPath, status: code, tracked: true });
  } else {
    files.push({ path: ns[i++], status: code, tracked: true });
  }
}
for (const path of git('ls-files', '-z', '--others', '--exclude-standard').split('\0').filter(Boolean)) {
  files.push({ path, status: 'A', tracked: false });
}

function hunksFor(f) {
  if (f.status === 'D') return [];
  if (!f.tracked) {
    if (!existsSync(f.path)) return [];
    const buf = readFileSync(f.path);
    if (buf.includes(0)) return [];
    const text = buf.toString('utf8');
    const n = text === '' ? 0 : text.replace(/\n$/, '').split('\n').length;
    if (n === 0) return [];
    return [{ start: 1, end: n }];
  }
  // For renames/copies pass both paths so only real content changes become hunks.
  const paths = f.oldPath ? [f.oldPath, f.path] : [f.path];
  const out = tryGit('diff', '-U0', '--no-color', '-M', mergeBase, '--', ...paths) || '';
  const hunks = [];
  for (const m of out.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    if (count === 0) hunks.push({ start, end: start, deletionOnly: true });
    else hunks.push({ start, end: start + count - 1 });
  }
  return hunks;
}

const buckets = {};
const skipped = [];
const appliedMigrationEdits = [];
const contractsChanged = [];
const packagesTouched = new Set();

for (const f of files) {
  const { bucket, skip } = bucketOf(f.path);
  if (!bucket) { skipped.push({ path: f.path, reason: skip }); continue; }
  f.bucket = bucket;
  if (bucket === 'migrations' && f.status !== 'A') appliedMigrationEdits.push({ path: f.path, status: f.status });
  if (bucket === 'contracts') contractsChanged.push(f.path);
  f.hunks = hunksFor(f);
  f.changedLines = f.hunks.reduce((s, h) => s + (h.deletionOnly ? 0 : h.end - h.start + 1), 0);
  const pkg = packageOf(f.path);
  if (pkg && ['ui', 'backend', 'persistence', 'domain', 'contracts', 'config'].includes(bucket)) packagesTouched.add(pkg);
  (buckets[bucket] ??= { files: [], changedLines: 0 }).files.push(f.path);
  buckets[bucket].changedLines += f.changedLines;
}
for (const [name, b] of Object.entries(buckets)) {
  b.review = REVIEW_BUCKETS.includes(name);
  b.splitPerFile = b.review && b.changedLines > LARGE_BUCKET_LINES;
}

// ---- contract sync (two copies of @devdigest/shared) -----------------------
const contractDrift = [];
for (const p of contractsChanged) {
  const rel = p.replace(CONTRACTS, '');
  const a = `client/src/vendor/shared/${rel}`;
  const b = `server/src/vendor/shared/${rel}`;
  const ca = existsSync(a) ? readFileSync(a, 'utf8') : null;
  const cb = existsSync(b) ? readFileSync(b, 'utf8') : null;
  if (ca !== cb) contractDrift.push({ file: rel, client: ca !== null, server: cb !== null });
}

const result = {
  base, mergeBase, head, branch, notes,
  empty: files.length === 0 || Object.keys(buckets).length === 0,
  packagesTouched: [...packagesTouched],
  buckets,
  files: files.filter((f) => f.bucket).map(({ tracked, ...f }) => f),
  appliedMigrationEdits,
  contractDrift,
  skipped,
};
console.log(JSON.stringify(result, null, 2));
