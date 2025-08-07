import fs from "fs";
import path from "path";
import { sync as globSync } from "glob";
import ignore from "ignore";

/**
 * This is standalone version of what the other files here now do, based on
 * and entirely different concept.
 *
 * TODO: Revisit if there are efficiencies here that can be repurpose to the
 * newer strategy.
 *
 * Quotes an object key if necessary (e.g., if it contains special characters).
 * Always returns a quoted key for consistency.
 *
 * @param key - The key to quote.
 * @returns The quoted key string.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
function quoteKey(key: string): string {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? `"${key}"` : JSON.stringify(key);
}

/**
 * Indents a line by a given number of spaces and trims trailing whitespace.
 *
 * @param line - The line to indent.
 * @param level - The number of spaces to indent.
 * @returns The indented line.
 */
function indent(line: string, level = 0): string {
  return " ".repeat(level) + line.trim();
}

/**
 * Finds the end of a JSON block (object or array) starting at the given line.
 *
 * @param lines - The full list of lines in the file.
 * @param startIdx - The index where the block starts.
 * @returns The index where the block ends.
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
 * Matches and extracts a JSON key from a line.
 *
 * @param line - A single line of text.
 * @returns The matched key name, or null if not found.
 */
function matchKey(line: string): string | null {
  const match = line.match(/^[ \t]*["']?([a-zA-Z0-9_\-$@]+)["']?\s*:/);
  return match ? match[1] : null;
}

/**
 * Parses comments from a JSON5 file and maps them to their associated key paths.
 *
 * Handles nesting, indentation, preserves multiline comment blocks, and supports
 * array item comments with numeric indices (e.g., "pnpm.onlyBuiltDependencies.0").
 * Now handles both preceding comments (above the line) and trailing comments (same line).
 *
 * @param lines - Lines from the existing JSON5 file.
 * @returns A map of key paths to associated comment info.
 */
function buildCommentMap(
  lines: string[],
): Record<string, { preceding: string[]; trailing?: string }> {
  const commentsMap: Record<
    string,
    { preceding: string[]; trailing?: string }
  > = {};
  const pathStack: string[] = [];
  const indentStack: number[] = [];
  const arrayIndexStack: number[] = [];
  let bufferedComments: string[] = [];
  let insideArray = false;

  /**
   * Extracts trailing comment from a line, correctly handling URLs with //
   */
  function extractTrailingComment(line: string): string | undefined {
    let searchStart = 0;

    while (true) {
      const commentIdx = line.indexOf("//", searchStart);
      if (commentIdx === -1) return undefined;

      // Count quotes before this "//" to check if we're inside a string
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Buffer line if it's a comment
    if (trimmed.startsWith("//")) {
      bufferedComments.push(line);
      continue;
    }

    // Handle array start - "key": [
    const arrayStartMatch = line.match(/^(\s*)(["']?)([^"']+)\2\s*:\s*\[\s*$/);
    if (arrayStartMatch) {
      const indent = arrayStartMatch[1].length;
      const key = arrayStartMatch[3];

      // Handle nesting like regular keys
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

      pathStack.push(key);
      indentStack.push(indent);
      arrayIndexStack.push(0);
      insideArray = true;
      bufferedComments = [];
      continue;
    }

    // Handle array items - lines that start with quotes but no colon
    if (insideArray && trimmed.startsWith('"') && !trimmed.includes(":")) {
      const currentArrayIndex = arrayIndexStack[arrayIndexStack.length - 1];
      const arrayItemPath = [...pathStack, currentArrayIndex.toString()].join(
        ".",
      );

      console.log(
        `Debug array item: index=${currentArrayIndex}, path="${arrayItemPath}", line="${trimmed}"`,
      );

      const commentInfo: { preceding: string[]; trailing?: string } = {
        preceding: [...bufferedComments],
      };

      const trailing = extractTrailingComment(line);
      if (trailing) {
        commentInfo.trailing = trailing;
        console.log(
          `Found trailing comment for ${arrayItemPath}: "${trailing}"`,
        );
      }

      if (commentInfo.preceding.length > 0 || commentInfo.trailing) {
        commentsMap[arrayItemPath] = commentInfo;
      }

      // Increment array index for next item
      arrayIndexStack[arrayIndexStack.length - 1]++;
      bufferedComments = [];
      continue;
    }

    // Handle regular object keys
    const keyMatch = line.match(/^(\s*)(["']?)([^"']+)\2\s*:/);
    if (keyMatch) {
      const indent = keyMatch[1].length;
      const key = keyMatch[3];

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

      if (trimmed.endsWith("{")) {
        pathStack.push(key);
        indentStack.push(indent);
        insideArray = false;
      }
    } else if (bufferedComments.length > 0 && trimmed !== "") {
      // Non-comment non-key line breaks comment block
      bufferedComments = [];
    }

    // Handle closing brackets
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
      pathStack.pop();
      indentStack.pop();
    }
  }

  return commentsMap;
}

/**
 * Synchronizes a JSON5 file's structure and values with the authoritative source JSON,
 * while preserving existing comments and formatting with trailing commas for version control.
 *
 * @param raw - Raw contents of the existing JSON5 file.
 * @param source - Parsed JSON object from package.json.
 * @returns The updated JSON5 content as a formatted string.
 */
function syncJson5(raw: string, source: Record<string, any>): string {
  const lines = raw.split("\n");
  const comments = buildCommentMap(lines);

  /**
   * Recursively writes a JSON object with proper formatting and inserted comments.
   *
   * @param obj - The object to write.
   * @param path - Dot-path to the current object context.
   * @param level - Current indentation level.
   * @returns The formatted lines of the object.
   */
  function writeObject(obj: any, path: string[] = [], level = 2): string[] {
    const result: string[] = [];
    const keys = Object.keys(obj);
    const indentSize = 2;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fullPath = [...path, key].join(".");
      const val = obj[key];
      const comma = ",";

      const commentInfo = comments[fullPath];

      // Add preceding comments
      if (commentInfo?.preceding) {
        for (const c of commentInfo.preceding) {
          result.push(indent(c, level));
        }
      }

      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        // Object with trailing comment on opening line
        const openLine = `${quoteKey(key)}: {`;
        const withTrailing = commentInfo?.trailing
          ? `${openLine} ${commentInfo.trailing}`
          : openLine;
        result.push(indent(withTrailing, level));
        result.push(...writeObject(val, [...path, key], level + indentSize));
        result.push(indent(`}${comma}`, level));
      } else if (Array.isArray(val)) {
        // Array with trailing comment on opening line
        const openLine = `${quoteKey(key)}: [`;
        const withTrailing = commentInfo?.trailing
          ? `${openLine} ${commentInfo.trailing}`
          : openLine;
        result.push(indent(withTrailing, level));

        for (let j = 0; j < val.length; j++) {
          const itemPath = [...path, key, j.toString()].join(".");
          const itemCommentInfo = comments[itemPath];

          if (itemCommentInfo?.preceding) {
            for (const c of itemCommentInfo.preceding) {
              result.push(indent(c, level + indentSize));
            }
          }

          // Array item with trailing comment
          const itemLine = `${JSON.stringify(val[j])},`;
          const withTrailing = itemCommentInfo?.trailing
            ? `${itemLine} ${itemCommentInfo.trailing}`
            : itemLine;
          result.push(indent(withTrailing, level + indentSize));
        }
        result.push(indent(`]${comma}`, level));
      } else {
        // Primitive value with trailing comment on same line
        const valueLine = `${quoteKey(key)}: ${JSON.stringify(val)}${comma}`;
        const withTrailing = commentInfo?.trailing
          ? `${valueLine} ${commentInfo.trailing}`
          : valueLine;
        result.push(indent(withTrailing, level));
      }
    }

    return result;
  }

  const generated = writeObject(source, [], 2);
  return `{\n${generated.join("\n")}\n}`;
}

// 🔁 Runner

const rootDir = process.cwd();
const ig = ignore();
const gitignorePath = path.join(rootDir, ".gitignore");

if (fs.existsSync(gitignorePath)) {
  ig.add(fs.readFileSync(gitignorePath, "utf8"));
}

const packageJsonPaths = globSync("**/package.json", {
  cwd: rootDir,
  ignore: ["**/node_modules/**"],
  absolute: true,
});

for (const packageJsonPath of packageJsonPaths) {
  const relPath = path.relative(rootDir, packageJsonPath);
  if (ig.ignores(relPath)) continue;

  const json5Path = packageJsonPath + "5";
  if (!fs.existsSync(json5Path)) {
    console.info(`⏩ Skipping ${relPath} — no package.json5 found`);
    continue;
  }

  const rawJson5 = fs.readFileSync(json5Path, "utf8");
  const sourceJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const updated = syncJson5(rawJson5, sourceJson);

  fs.writeFileSync(json5Path, updated);
  console.info(`✅ Synced ${relPath} → ${path.basename(json5Path)}`);
}
