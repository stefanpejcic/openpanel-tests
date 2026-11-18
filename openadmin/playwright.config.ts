import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL;
// with a second server set, it's joined to BASE_URL as a slave and every spec runs on it too, through the master
const SLAVE_URL = process.env.SLAVE_URL;

if (!BASE_URL) {
  throw new Error('BASE_URL must be set in .env');
}

export default defineConfig({
  testDir: '.',

  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'cluster-setup',
      testMatch: /cluster\.setup\.ts/,
      dependencies: ['setup'],
    },
    {
      // issue #1357, Delete unused has to run before any plan, user or service exists
      name: 'podman-cleanup',
      testDir: './tests',
      testMatch: /0-podman_delete_unused\.spec\.ts/,
      dependencies: ['cluster-setup'],
      use: {
        storageState: path.join(__dirname, '../.auth/session.json'),
      },
    },
    {
      name: 'tests',
      testDir: './tests',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /0-podman_delete_unused\.spec\.ts/,
      dependencies: ['podman-cleanup'],
      use: {
        storageState: path.join(__dirname, '../.auth/session.json'),
      },
    },
    ...(SLAVE_URL
      ? [
          {
            name: 'tests-slave',
            testDir: './tests',
            testMatch: /.*\.spec\.ts/,
            // the cluster page and the switcher only exist on the master
            testIgnore: [/cluster\.spec\.ts/, /0-podman_delete_unused\.spec\.ts/],
            // not on tests, a failed master spec would skip the whole slave run
            dependencies: ['cluster-setup'],
            use: {
              storageState: path.join(__dirname, '../.auth/session-slave.json'),
            },
          },
        ]
      : []),
  ],
});
