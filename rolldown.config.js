import { defineConfig } from 'rolldown';

export default defineConfig({
  input: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  external: ['trash'],
  output: {
    dir: 'dist',
    format: 'cjs',
    entryFileNames: '[name].cjs',
    sourcemap: true,
    banner: (chunk) => (chunk.name === 'cli' ? '#!/usr/bin/env node' : ''),
  },
});
