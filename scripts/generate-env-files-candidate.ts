#!/usr/bin/env tsx
import path from "node:path";

import { run as generate } from "./generate-env-files";

const legacyOut =
  process.argv[2] || path.resolve(process.cwd(), "dist/env-files");
process.argv[2] = legacyOut;

generate();
