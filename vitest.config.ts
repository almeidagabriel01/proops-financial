import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: [
        // Generated types — not testable
        'src/lib/supabase/types.ts',
        // Infrastructure clients — no logic to unit test
        'src/lib/supabase/**',
        // String constants — no logic to test
        'src/lib/ai/prompts/**',
        // TypeScript-only type definitions
        'src/lib/parsers/types.ts',
        // Re-exports with no logic
        'src/lib/utils.ts',
        // UI-only config (Lucide icons) — needs jsdom
        'src/lib/utils/categories.ts',
        // Pure exported constants — no logic
        'src/lib/utils/constants.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reporter: ['text', 'html', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
