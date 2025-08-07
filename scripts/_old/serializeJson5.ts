import fs from "fs";
import { ParsedJson5 } from "./parseJson5File";

/**
 * Serializes a parsed JSON5 structure back into a formatted string with preserved comments and formatting.
 *
 * This function reconstructs the original JSON5 file from the parsed structure, maintaining:
 * - All preceding comments (single-line and block comments)
 * - Trailing comments on the same line as JSON content
 * - Original indentation and line structure
 * - Proper line breaks and spacing
 *
 * The serialization process preserves the exact formatting that was captured during parsing,
 * ensuring that comments and structure remain intact after synchronization operations.
 *
 * @param parsed - The parsed JSON5 structure containing lines, comments, and formatting
 * @returns Formatted JSON5 string ready to be written to a file
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
export function serializeJson5(parsed: ParsedJson5): string {
  return parsed
    .map(({ precedingComments, rawLine, trailingComment }) => {
      // Build preceding comments block (if any exist)
      const commentBlock = precedingComments.length
        ? precedingComments.join("\n") + "\n"
        : "";

      // Combine main content with trailing comment (if present)
      const lineWithTrailing = trailingComment
        ? `${rawLine} ${trailingComment}`
        : rawLine;

      // Return complete line with comments
      return commentBlock + lineWithTrailing;
    })
    .join("\n");
}

/**
 * Writes a parsed JSON5 structure to a file with proper UTF-8 encoding.
 *
 * This is a convenience function that serializes the parsed structure
 * and writes it directly to the specified file path.
 *
 * @param parsed - The parsed JSON5 structure to write
 * @param filePath - Destination file path for the JSON5 output
 */
export function writeJson5ToFile(parsed: ParsedJson5, filePath: string) {
  const output = serializeJson5(parsed);
  fs.writeFileSync(filePath, output, "utf-8");
}
