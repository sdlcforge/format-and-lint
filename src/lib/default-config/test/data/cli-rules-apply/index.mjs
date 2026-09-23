// Byte-for-byte the same body as the two CLI fixtures, but at a path matching neither CLI signal --
// so 'no-console' and 'no-process-exit' both still apply here.
console.log('hello from the library')

process.exit(0)
