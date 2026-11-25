---
name: engineering-insights
description: "Captures non-obvious engineering lessons into the INSIGHTS.md of the package being worked on (client/, server/, reviewer-core/, e2e/). Trigger right after a confirmed fix for a non-obvious bug, after a dead end or abandoned approach, after a library/tool quirk, an undocumented convention or a decision with a reason, and whenever the user corrects the agent. Also trigger on 'wrap up', 'what did we learn', 'record this', 'запиши інсайт', at the end of any task that took real debugging, and on 'engineering-insights review' to audit a file."
---

# Engineering insights

Turns what this session learned into notes the next session reads before it starts.
Each package keeps its own `INSIGHTS.md` next to its code.

## Modes
- **Capture** (during work): one insight just confirmed → write it, report in one line.
- **Wrap-up** (end of task, or "wrap up"): review the whole session, draft up to 5
  candidates, show their **exact text** and target file, write only the ones the user approves
  (one question, multi-select, always with a "none" option).
- **Review** (`engineering-insights review [pkg]`): see "Review mode" below.

Rank wrap-up candidates: user corrections → dead ends → recurring errors → patterns → the rest.
Skip trivial edits, typos, and routine work.

## Quality gate — write only if ALL three pass
1. **Not obvious** to anyone reading the code, `README.md`, `CLAUDE.md` or `docs/`.
2. **Changes behaviour** — the next session would act differently (saves 5+ minutes).
3. **Actionable cold** — concrete names (file, function, library, command, number), at most
   two sentences, never "be careful with X". Unconfirmed → Open Questions only.

See [examples.md](examples.md) for vague vs useful entries and what is NOT an insight.

## Where to write
- The package whose files you touched: `<pkg>/INSIGHTS.md`
  (`client/`, `server/`, `reviewer-core/`, `e2e/`; repo-intel → `server/`).
- Cross-package: write it where the symptom shows; name the other package in the entry.
- A rule every agent must ALWAYS follow belongs in `CLAUDE.md` — propose that line to the
  user instead of writing an insight.

## Which section
| Section | Put here |
|---|---|
| What Works | approaches that solved a real problem |
| What Doesn't Work | dead ends, antipatterns, things tried and abandoned |
| Codebase Patterns | undocumented conventions; decisions + the reason |
| Tool & Library Notes | quirks of dependencies, CLIs, Docker, test runners |
| Recurring Errors & Fixes | an error message/symptom → its cause → the fix |
| Session Notes | dated one-line summary of a session that changed understanding |
| Open Questions | unresolved puzzles worth investigating later |

## Entry format (use exactly)
```
- YYYY-MM-DD — <insight, max two sentences>. Why: <reason>. Ref: path/to/file.ts#symbol
```
Ref names a file plus function/constant — not a line number (lines drift).

## Rules
- **Search first.** Read the target file and the package `CLAUDE.md`/`README.md`. Same meaning
  already there → skip. It sharpens an entry → propose the sharper wording. It contradicts
  an entry → append `Supersedes YYYY-MM-DD: …`.
- **Append-only.** Add at the end of the section. Never delete or rewrite entries without
  explicit user approval.
- Never write secrets, tokens, or contents of user repos under `server/clones/`.
- After writing, tell the user in one line what you recorded and in which file.

## Review mode
For the given package (or all four): report entry count per section, then list duplicates,
contradictions, weak entries ("be careful…"), entries whose Ref no longer exists, entries
now covered by docs, and misfiled entries. Propose merges/removals; change nothing until the
user approves. Suggest a review when a file passes ~100 entries.
