// Compatibility shim: some generated payload files import './importMap'
// (no extension). The real generated import map lives in `importMap.js`.
// Re-export it here so both `import './importMap'` and `import './importMap.js'`
// resolve successfully in different build environments.
export { importMap } from './importMap.js'
