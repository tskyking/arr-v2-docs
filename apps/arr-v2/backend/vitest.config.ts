import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['services/**/*.test.ts'],
    env: {
      // Keep test persistence isolated from the app's default DATA_DIR so local/CI
      // test runs don't create deployable-looking JSON state under backend/data.
      DATA_DIR: join(tmpdir(), `arr-v2-vitest-data-${process.pid}`),
    },
  },
});
