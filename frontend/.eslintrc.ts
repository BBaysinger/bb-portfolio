import { Linter } from "eslint";

const config: Linter.Config = {
  parser: "@typescript-eslint/parser", // Use TypeScript parser
  parserOptions: {
    ecmaVersion: 2020, // Support modern ECMAScript features
    sourceType: "module", // Support for ES Modules (import/export)
    project: "./tsconfig.json", // Link to tsconfig.json for type-aware linting
  },
  plugins: ["@typescript-eslint"], // Enable TypeScript plugin
  extends: [
    "eslint:recommended", // Base ESLint recommended rules
    "plugin:@typescript-eslint/recommended", // TypeScript-specific rules
    "plugin:@typescript-eslint/recommended-requiring-type-checking", // Type-aware rules
    "prettier", // Integrate with Prettier
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }, // Allow unused vars/args prefixed with "_"
    ],
    "@typescript-eslint/no-explicit-any": "warn", // Warn on use of "any" type
    "@typescript-eslint/explicit-module-boundary-types": "off", // Don't force return types on functions
    "@typescript-eslint/no-empty-function": "off", // Allow empty functions
  },
  env: {
    browser: true, // Enable browser globals like "window"
    es2021: true, // Enable ES2021 features
    node: true, // Enable Node.js globals like "process"
  },
  ignorePatterns: ["node_modules/", "dist/"], // Ignore build output and dependencies
};

export default config;
