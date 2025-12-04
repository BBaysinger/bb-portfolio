#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";

import { parseCliOptions, writeEnvFiles } from "./lib/env-writers";
import { loadSecretsFromJson5 } from "./lib/secrets-json5";

const run = () => {
  const options = parseCliOptions(process.argv.slice(2));
  writeEnvFiles({
    ...options,
    resolveSecrets: (profile) => loadSecretsFromJson5({ profile }),
  });
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}

export { run };
