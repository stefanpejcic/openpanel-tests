import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', 
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'tests',
      testDir: './openadmin',
      dependencies: ['setup'],
      use: {
        storageState: '.auth/session.json',
      },
    },
  ],
});
