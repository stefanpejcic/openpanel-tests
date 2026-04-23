import { defineConfig } from '@playwright/test';

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
