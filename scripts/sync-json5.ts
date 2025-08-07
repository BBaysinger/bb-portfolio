import fs from "fs";
import path from "path";
import { sync as globSync } from "glob";
import ignore from "ignore";

/**
 * JSON5 Package Synchronization Tool
 *
 * Synchronizes package.json5 files with their canonical package.json counterparts,
 * preserving all comments and formatting while applying the latest dependency versions
 * and configuration from the authoritative source.
 *
 * This tool handles:
 * - Preceding comments (above keys/array items)
 * - Trailing comments (on the same line as values)
 * - Nested objects and arrays with proper path tracking
 * - Array items with individual comments
 * - Scoped packages (@org/package) and URLs in comments
 * - Trailing commas for version control benefits
 *
 * TODO: Expose syncJson5(raw, source) as the core API, and let users pass their own
 * file loaders if they want.
 * TODO: Possibly support .jsonc as an option down the line, with a toggle.
 * TODO: Get this into an open source package for wider use
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */

/**
 * Quotes an object key for consistent JSON5 formatting.
 * Always returns a quoted key to maintain consistency across all properties.
 *
 * @param key - The key to quote
 * @returns The quoted key string (e.g., "scripts", "dependencies")
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
function quoteKey(key: string): string {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? `"${key}"` : JSON.stringify(key);
}

/**
 * Indents a line by the specified number of spaces and trims trailing whitespace.
 * Used to maintain consistent indentation throughout the generated JSON5.
 *
 * @param line - The line to indent
 * @param level - The number of spaces to indent (default: 0)
 * @returns The properly indented line
 */
function indent(line: string, level = 0): string {
  return " ".repeat(level) + line.trim();
}

/**
 * Finds the end of a JSON block (object or array) starting at the given line.
 * Used for parsing complex nested structures in the original implementation.
 *
 * NOTE: This function is currently unused in the final implementation but
 * preserved for potential future use or alternative parsing strategies.
 *
 * @param lines - The full list of lines in the file
 * @param startIdx - The index where the block starts
 * @returns Object containing the index where the block ends
 */
function extractBlock(lines: string[], startIdx: number): { endIdx: number } {
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const open = (lines[i].match(/[{\[]/g) || []).length;
    const close = (lines[i].match(/[}\]]/g) || []).length;
    depth += open - close;
    if (depth <= 0) return { endIdx: i };
  }
  return { endIdx: lines.length - 1 };
}

/**
 * Matches and extracts a JSON key from a line using simple regex.
 * Used in earlier iterations but replaced by more robust parsing logic.
 *
 * NOTE: This function is currently unused in the final implementation but
 * preserved for reference or alternative parsing approaches.
 *
 * @param line - A single line of text
 * @returns The matched key name, or null if not found
 */
function matchKey(line: string): string | null {
  const match = line.match(/^[ \t]*["']?([a-zA-Z0-9_\-$@]+)["']?\s*:/);
  return match ? match[1] : null;
}

/**
 * Parses a JSON5 file and builds a comprehensive comment map with path-based indexing.
 *
 * This is the core parsing function that:
 * - Tracks nested object/array structure using path stacks
 * - Maps comments to their associated JSON paths (e.g., "pnpm.onlyBuiltDependencies.0")
 * - Handles both preceding comments (above lines) and trailing comments (same line)
 * - Correctly detects comments vs URLs containing "//" sequences
 * - Supports array items with individual comments and numeric indices
 *
 * The comment map structure allows for precise reconstruction of the original
 * formatting while applying new data from the canonical source.
 *
 * @param lines - Lines from the existing JSON5 file
 * @returns A map of dot-notation paths to comment information
 */
function buildCommentMap(
  lines: string[],
): Record<string, { preceding: string[]; trailing?: string }> {
  const commentsMap: Record<
    string,
    { preceding: string[]; trailing?: string }
  > = {};

  // State tracking for nested structure parsing
  const pathStack: string[] = []; // Current JSON path (e.g., ["pnpm", "onlyBuiltDependencies"])
  const indentStack: number[] = []; // Indentation levels for nesting detection
  const arrayIndexStack: number[] = []; // Current index within arrays
  let bufferedComments: string[] = []; // Accumulated preceding comments
  let insideArray = false; // Flag to track array context

  /**
   * Extracts trailing comments from a line while correctly handling URLs.
   *
   * This function solves the tricky problem of detecting actual comments vs
   * "//" sequences that appear inside string values (like URLs). It uses
   * quote counting to determine if a "//" is inside or outside a string.
   *
   * Examples:
   * - `"url": "https://github.com/user/repo", // This is a comment` ✅
   * - `"url": "https://github.com/user/repo"` (no comment) ✅
   *
   * @param line - The line to analyze for trailing comments
   * @returns The trailing comment string (including "//") or undefined
   */
  function extractTrailingComment(line: string): string | undefined {
    let searchStart = 0;

    while (true) {
      const commentIdx = line.indexOf("//", searchStart);
      if (commentIdx === -1) return undefined;

      // Count quotes before this "//" to determine if we're inside a string
      const beforeComment = line.slice(0, commentIdx);
      const quoteCount = (beforeComment.match(/"/g) || []).length;

      // Even number of quotes = outside string = actual comment
      if (quoteCount % 2 === 0) {
        return line.slice(commentIdx).trim();
      }

      // Odd number = inside string (like URL), keep searching
      searchStart = commentIdx + 2;
    }
  }

  // Main parsing loop - processes each line to build the comment map
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Collect preceding comments (lines that start with //)
    if (trimmed.startsWith("//")) {
      bufferedComments.push(line);
      continue;
    }

    // Handle array start patterns: "key": [
    const arrayStartMatch = line.match(/^(\s*)(["']?)([^"']+)\2\s*:\s*\[\s*$/);
    if (arrayStartMatch) {
      const indent = arrayStartMatch[1].length;
      const key = arrayStartMatch[3];

      // Handle nesting by popping completed levels
      while (
        indentStack.length &&
        indent <= indentStack[indentStack.length - 1]
      ) {
        pathStack.pop();
        indentStack.pop();
        if (arrayIndexStack.length > 0) {
          arrayIndexStack.pop();
        }
      }

      const fullPath = [...pathStack, key].join(".");

      // Store comments for the array itself (both preceding and trailing)
      const commentInfo: { preceding: string[]; trailing?: string } = {
        preceding: [...bufferedComments],
      };

      const trailing = extractTrailingComment(line);
      if (trailing) {
        commentInfo.trailing = trailing;
      }

      if (commentInfo.preceding.length > 0 || commentInfo.trailing) {
        commentsMap[fullPath] = commentInfo;
      }

      // Update state for array processing
      pathStack.push(key);
      indentStack.push(indent);
      arrayIndexStack.push(0); // Start array index at 0
      insideArray = true;
      bufferedComments = [];
      continue;
    }

    // Handle array items - lines that start with quotes but contain no colon
    if (insideArray && trimmed.startsWith('"') && !trimmed.includes(":")) {
      const currentArrayIndex = arrayIndexStack[arrayIndexStack.length - 1];
      const arrayItemPath = [...pathStack, currentArrayIndex.toString()].join(
        ".",
      );

      const commentInfo: { preceding: string[]; trailing?: string } = {
        preceding: [...bufferedComments],
      };

      const trailing = extractTrailingComment(line);
      if (trailing) {
        commentInfo.trailing = trailing;
      }

      if (commentInfo.preceding.length > 0 || commentInfo.trailing) {
        commentsMap[arrayItemPath] = commentInfo;
      }

      // Increment array index for next item and clear comment buffer
      arrayIndexStack[arrayIndexStack.length - 1]++;
      bufferedComments = [];
      continue;
    }

    // Handle regular object keys - supports scoped packages with improved regex
    const keyMatch = line.match(/^(\s*)(["']?)([^"']+)\2\s*:/);
    if (keyMatch) {
      const indent = keyMatch[1].length;
      const key = keyMatch[3];

      // Handle nesting by checking indentation levels
      while (
        indentStack.length &&
        indent <= indentStack[indentStack.length - 1]
      ) {
        pathStack.pop();
        indentStack.pop();
        if (arrayIndexStack.length > 0) {
          arrayIndexStack.pop();
        }
      }

      const fullPath = [...pathStack, key].join(".");

      // Collect both preceding and trailing comments for this key
      const commentInfo: { preceding: string[]; trailing?: string } = {
        preceding: [...bufferedComments],
      };

      const trailing = extractTrailingComment(line);
      if (trailing) {
        commentInfo.trailing = trailing;
      }

      if (commentInfo.preceding.length > 0 || commentInfo.trailing) {
        commentsMap[fullPath] = commentInfo;
      }

      bufferedComments = [];

      // If this is an object start, update the path stack
      if (trimmed.endsWith("{")) {
        pathStack.push(key);
        indentStack.push(indent);
        insideArray = false;
      }
    } else if (bufferedComments.length > 0 && trimmed !== "") {
      // Non-comment, non-key lines break the comment block
      bufferedComments = [];
    }

    // Handle closing brackets to maintain proper nesting
    if (
      trimmed === "}" ||
      trimmed === "}," ||
      trimmed === "]" ||
      trimmed === "],"
    ) {
      if (trimmed.startsWith("]")) {
        insideArray = false;
        if (arrayIndexStack.length > 0) {
          arrayIndexStack.pop();
        }
      }
      if (pathStack.length) pathStack.pop();
      if (indentStack.length) indentStack.pop();
    }
  }

  return commentsMap;
}

/**
 * Synchronizes a JSON5 file with its canonical JSON source while preserving formatting.
 *
 * This is the main synchronization function that:
 * - Parses the existing JSON5 to extract comments and structure
 * - Applies the canonical JSON data as the source of truth
 * - Reconstructs the JSON5 with preserved comments and consistent formatting
 * - Uses trailing commas throughout for version control benefits
 *
 * The process ensures that while the data stays synchronized with the canonical
 * source, all the valuable documentation and formatting is maintained.
 *
 * @param raw - Raw contents of the existing JSON5 file
 * @param source - Parsed JSON object from the canonical package.json
 * @returns The updated JSON5 content as a formatted string
 */
function syncJson5(raw: string, source: Record<string, any>): string {
  const lines = raw.split("\n");
  const comments = buildCommentMap(lines);

  /**
   * Recursively writes a JSON object with proper formatting and preserved comments.
   *
   * This function handles the reconstruction of the JSON5 structure by:
   * - Applying comments from the comment map to their appropriate locations
   * - Maintaining consistent indentation and formatting
   * - Adding trailing commas to all elements for version control benefits
   * - Handling nested objects, arrays, and primitive values appropriately
   *
   * @param obj - The object to write (from canonical JSON)
   * @param path - Dot-notation path to the current object context
   * @param level - Current indentation level in spaces
   * @returns Array of formatted lines representing this object
   */
  function writeObject(obj: any, path: string[] = [], level = 2): string[] {
    const result: string[] = [];
    const keys = Object.keys(obj);
    const indentSize = 2;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fullPath = [...path, key].join(".");
      const val = obj[key];
      const comma = ","; // Always add trailing comma for version control benefits

      const commentInfo = comments[fullPath];

      // Add any preceding comments above this key
      if (commentInfo?.preceding) {
        for (const c of commentInfo.preceding) {
          result.push(indent(c, level));
        }
      }

      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        // Handle nested objects with optional trailing comment on opening brace
        const openLine = `${quoteKey(key)}: {`;
        const withTrailing = commentInfo?.trailing
          ? `${openLine} ${commentInfo.trailing}`
          : openLine;
        result.push(indent(withTrailing, level));

        // Recursively process nested object
        result.push(...writeObject(val, [...path, key], level + indentSize));
        result.push(indent(`}${comma}`, level));
      } else if (Array.isArray(val)) {
        // Handle arrays with optional trailing comment on opening bracket
        const openLine = `${quoteKey(key)}: [`;
        const withTrailing = commentInfo?.trailing
          ? `${openLine} ${commentInfo.trailing}`
          : openLine;
        result.push(indent(withTrailing, level));

        // Process each array item with individual comments
        for (let j = 0; j < val.length; j++) {
          const itemPath = [...path, key, j.toString()].join(".");
          const itemCommentInfo = comments[itemPath];

          // Add preceding comments for this array item
          if (itemCommentInfo?.preceding) {
            for (const c of itemCommentInfo.preceding) {
              result.push(indent(c, level + indentSize));
            }
          }

          // Add array item with optional trailing comment
          const itemLine = `${JSON.stringify(val[j])},`;
          const withTrailing = itemCommentInfo?.trailing
            ? `${itemLine} ${itemCommentInfo.trailing}`
            : itemLine;
          result.push(indent(withTrailing, level + indentSize));
        }
        result.push(indent(`]${comma}`, level));
      } else {
        // Handle primitive values (strings, numbers, booleans) with optional trailing comment
        const valueLine = `${quoteKey(key)}: ${JSON.stringify(val)}${comma}`;
        const withTrailing = commentInfo?.trailing
          ? `${valueLine} ${commentInfo.trailing}`
          : valueLine;
        result.push(indent(withTrailing, level));
      }
    }

    return result;
  }

  // Generate the complete JSON5 structure
  const generated = writeObject(source, [], 2);
  return `{\n${generated.join("\n")}\n}`;
}

// 🔁 Main Execution Runner
//
// This section handles the file discovery and processing logic:
// - Finds all package.json files in the project (excluding node_modules)
// - Checks for corresponding package.json5 files
// - Applies gitignore rules to skip excluded files
// - Performs synchronization for each valid pair

const rootDir = process.cwd();
const ig = ignore();
const gitignorePath = path.join(rootDir, ".gitignore");

// Load gitignore rules if available
if (fs.existsSync(gitignorePath)) {
  ig.add(fs.readFileSync(gitignorePath, "utf8"));
}

// Find all package.json files recursively, excluding node_modules
const packageJsonPaths = globSync("**/package.json", {
  cwd: rootDir,
  ignore: ["**/node_modules/**"],
  absolute: true,
});

// Process each package.json to sync with its package.json5 counterpart
for (const packageJsonPath of packageJsonPaths) {
  const relPath = path.relative(rootDir, packageJsonPath);

  // Skip files that match gitignore patterns
  if (ig.ignores(relPath)) continue;

  const json5Path = packageJsonPath + "5"; // package.json5

  // Skip if no corresponding package.json5 exists
  if (!fs.existsSync(json5Path)) {
    console.info(`⏩ Skipping ${relPath} — no package.json5 found`);
    continue;
  }

  // Perform the synchronization
  const rawJson5 = fs.readFileSync(json5Path, "utf8");
  const sourceJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const updated = syncJson5(rawJson5, sourceJson);

  // Write the synchronized result
  fs.writeFileSync(json5Path, updated);
  console.info(`✅ Synced ${relPath} → ${path.basename(json5Path)}`);
}
