import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'setup',
      testDir: '..',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'tests',
      testMatch: '**/*.spec.ts',
      use: {
        storageState: '.auth/session.json',
      },
    },
  ],
});
