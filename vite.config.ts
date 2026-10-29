import { defineConfig } from 'vitest/config';

// GitHub Pages serve il sito sotto /<nome-repo>/
export default defineConfig({
  base: process.env.BASE_PATH ?? '/chord-progressions/',
  build: { target: 'es2022', sourcemap: true },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
