import fs from "fs";
import path from "path";
import { sync as globSync } from "glob";
import ignore from "ignore";

function quoteKey(key: string): string {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? `"${key}"` : JSON.stringify(key);
}

function indent(line: string, level = 0): string {
  return " ".repeat(level) + line.trim();
}

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

function matchKey(line: string): string | null {
  const match = line.match(/^[ \t]*["']?([a-zA-Z0-9_\-$@]+)["']?\s*:/);
  return match ? match[1] : null;
}

function buildCommentMap(lines: string[]): Record<string, string[]> {
  const commentsMap: Record<string, string[]> = {};
  const pathStack: string[] = [];
  const indentStack: number[] = [];
  let bufferedComments: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Buffer any comments
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
    }

    // Reset buffer if any non-comment, non-key line appears
    else if (bufferedComments.length > 0 && trimmed !== "") {
      bufferedComments = [];
    }

    if (trimmed === "}" || trimmed === "}," || trimmed === "],") {
      pathStack.pop();
      indentStack.pop();
    }
  }

  return commentsMap;
}

function syncJson5(raw: string, source: Record<string, any>): string {
  const lines = raw.split("\n");
  const comments = buildCommentMap(lines);

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
    console.log(`⏩ Skipping ${relPath} — no package.json5 found`);
    continue;
  }

  const rawJson5 = fs.readFileSync(json5Path, "utf8");
  const sourceJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const updated = syncJson5(rawJson5, sourceJson);

  fs.writeFileSync(json5Path, updated);
  console.log(`✅ Synced ${relPath} → ${path.basename(json5Path)}`);
}
