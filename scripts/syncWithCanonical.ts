import { ParsedJson5, CommentedLine } from "./parseJson5File";
import fs from "fs";
import path from "path";

/**
 * Syncs a parsed JSON5 file with the canonical JSON structure.
 * Adds, removes, and reorders entries based on the canonical object.
 */
export function syncWithCanonical(
  parsed: ParsedJson5,
  canonical: Record<string, any>,
): string {
  const result: string[] = [];
  const seenKeys = new Set<string>();

  // Helper to stringify JSON with correct indentation
  const stringifyValue = (value: any): string => {
    return JSON.stringify(value, null, 2).replace(/^/gm, "  ");
  };

  for (const [key, value] of Object.entries(canonical)) {
    const match = parsed.find((entry) => {
      const trimmedKey = entry.keyOrValue
        .trim()
        .replace(/^["']/, "")
        .replace(/["']:$/, "");
      return trimmedKey === key;
    });

    if (match) {
      seenKeys.add(key);
      result.push(...match.precedingComments);
      result.push(
        `  "${key}": ${stringifyValue(value)},${
          match.trailingComment ? " " + match.trailingComment : ""
        }`,
      );
    } else {
      // New key not in JSON5 file — no comments
      result.push(`  "${key}": ${stringifyValue(value)},`);
    }
  }

  return `{
${result.join("\n")}
}`;
}
