import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 7100 },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
