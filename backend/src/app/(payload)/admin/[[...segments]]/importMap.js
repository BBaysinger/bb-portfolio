// NOTE: This file is intentionally JavaScript.
// Payload/Next admin output expects to import `./importMap.js` at runtime from inside
// `admin/[[...segments]]`, so we keep the filename/extension stable and provide a tiny
// re-export shim here.
//
// Converting this to TypeScript would typically require changing the emitted runtime
// import path/extension (or adding a build step to ensure a `.js` file exists), which
// can break those generated imports.
export * from '../../importMap.js'
