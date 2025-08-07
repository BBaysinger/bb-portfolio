import fs from "fs";
import { ParsedJson5 } from "./parseJson5File";

/**
 * Serializes a parsed JSON5 structure back into a string with preserved comments.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export function serializeJson5(parsed: ParsedJson5): string {
  return parsed
    .map(({ precedingComments, rawLine, trailingComment }) => {
      const commentBlock = precedingComments.length
        ? precedingComments.join("\n") + "\n"
        : "";
      const lineWithTrailing = trailingComment
        ? `${rawLine} ${trailingComment}`
        : rawLine;
      return commentBlock + lineWithTrailing;
    })
    .join("\n");
}

/**
 * Writes a parsed JSON5 structure to a file.
 */
export function writeJson5ToFile(parsed: ParsedJson5, filePath: string) {
  const output = serializeJson5(parsed);
  fs.writeFileSync(filePath, output, "utf-8");
}
