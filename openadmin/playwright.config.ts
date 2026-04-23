import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'tests',
      dependencies: ['setup'],
      use: {
        storageState: '.auth/session.json',
      },
    },
  ],
});
