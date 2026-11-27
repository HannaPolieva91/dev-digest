import type { FindingRecord } from "@devdigest/shared";

/** `file:12`, or `file:12-18` when the finding spans several lines. */
export function lineRef(f: Pick<FindingRecord, "file" | "start_line" | "end_line">): string {
  return f.end_line > f.start_line
    ? `${f.file}:${f.start_line}-${f.end_line}`
    : `${f.file}:${f.start_line}`;
}

/** First non-empty line of a markdown rationale, trimmed (the card truncates it with CSS). */
export function firstLine(md: string): string {
  return md.split("\n").find((l) => l.trim())?.trim() ?? "";
}
