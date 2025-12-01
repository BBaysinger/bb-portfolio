// Compatibility shim so generated admin pages importing `./importMap.js`
// (from inside `[[...segments]]`) resolve successfully. Re-exports
// the runtime importMap generated at `src/app/(payload)/importMap.js`.
export * from '../../importMap.js'
