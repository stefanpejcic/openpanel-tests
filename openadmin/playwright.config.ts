import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: '.',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'tests',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: '.auth/session.json',
      },
    },
  ],
});
