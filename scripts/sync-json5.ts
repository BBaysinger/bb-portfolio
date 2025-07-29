import fs from "fs";
import path from "path";
import { sync as globSync } from "glob";
import ignore from "ignore";

/**
 * Quotes an object key if necessary (e.g., if it contains special characters).
 * Always returns a quoted key for consistency.
 *
 * @param key - The key to quote.
 * @returns The quoted key string.
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
 * Handles nesting, indentation, and preserves multiline comment blocks.
 *
 * @param lines - Lines from the existing JSON5 file.
 * @returns A map of key paths to associated comment lines.
 */
function buildCommentMap(lines: string[]): Record<string, string[]> {
  const commentsMap: Record<string, string[]> = {};
  const pathStack: string[] = [];
  const indentStack: number[] = [];
  let bufferedComments: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Buffer line if it's a comment
    if (trimmed.startsWith("//")) {
      bufferedComments.push(line);
      continue;
    }

    const keyMatch = line.match(/^(\s*)(["']?)([\w\-@:$]+)\2\s*:/);
    if (keyMatch) {
      const indent = keyMatch[1].length;
      const key = keyMatch[3];

      while (
        indentStack.length &&
        indent <= indentStack[indentStack.length - 1]
      ) {
        pathStack.pop();
        indentStack.pop();
      }

      const fullPath = [...pathStack, key].join(".");

      if (bufferedComments.length > 0) {
        commentsMap[fullPath] = [...bufferedComments];
        bufferedComments = [];
      }

      if (trimmed.endsWith("{")) {
        pathStack.push(key);
        indentStack.push(indent);
      }
    } else if (bufferedComments.length > 0 && trimmed !== "") {
      // Non-comment non-key line breaks comment block
      bufferedComments = [];
    }

    if (trimmed === "}" || trimmed === "}," || trimmed === "],") {
      pathStack.pop();
      indentStack.pop();
    }
  }

  return commentsMap;
}

/**
 * Synchronizes a JSON5 file's structure and values with the authoritative source JSON,
 * while preserving existing comments and formatting.
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
      const comma = i < keys.length - 1 ? "," : "";

      const comment = comments[fullPath];
      if (comment) {
        for (const c of comment) {
          result.push(indent(c, level));
        }
      }

      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        result.push(indent(`${quoteKey(key)}: {`, level));
        result.push(...writeObject(val, [...path, key], level + indentSize));
        result.push(indent(`}${comma}`, level));
      } else if (Array.isArray(val)) {
        result.push(indent(`${quoteKey(key)}: [`, level));
        for (let j = 0; j < val.length; j++) {
          result.push(
            indent(
              `${JSON.stringify(val[j])}${j < val.length - 1 ? "," : ""}`,
              level + indentSize,
            ),
          );
        }
        result.push(indent(`]${comma}`, level));
      } else {
        result.push(
          indent(`${quoteKey(key)}: ${JSON.stringify(val)}${comma}`, level),
        );
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
