import { test, expect } from '@playwright/test';

// https://github.com/stefanpejcic/python-helloworld

const DOMAIN = 'python.tests.openpanel.org';
const APP_NAME = 'pythonaplikacija';
const PORT = '5000';
const STARTUP_FILE = `/var/www/html/${DOMAIN}/app.py`;

const REQUIREMENTS_TXT = `Flask==2.3.3`;

const APP_PY = `from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello World from Flask on port 5000!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)`;

let pythonVersion: string;

test.describe.configure({ mode: 'serial' });

test.describe('Python autoinstaller', () => {
  test('1. create app files', async ({ page }) => {
    // requirements.txt
    await page.goto(
      `/file-manager/edit-file/${DOMAIN}/requirements.txt?editor=text&new=true`
    );

    await page.locator('#editor-text').fill(REQUIREMENTS_TXT);

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByText(/saved|success/i).first()
    ).toBeVisible();

    // app.py
    await page.goto(
      `/file-manager/edit-file/${DOMAIN}/app.py?editor=text&new=true`
    );

    await page.locator('#editor-text').fill(APP_PY);

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByText(/saved|success/i).first()
    ).toBeVisible();
  });

  test('2. install app', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('/python/install');

    await page.locator('#service_name').fill(APP_NAME);
    await page.locator('#port').fill(PORT);

    await page.locator('#domain_id').selectOption({
      label: DOMAIN,
    });

    await page.locator('#startup_file').fill(STARTUP_FILE);

    const versionSelect = page.locator('#version');

    // Wait for Python versions to be populated dynamically.
    await expect
      .poll(
        async () => {
          return await versionSelect.locator('option').count();
        },
        {
          timeout: 30000,
          message: 'Waiting for Python versions to load',
        }
      )
      .toBeGreaterThan(0);

    // Get all available versions.
    const versions = await versionSelect
      .locator('option')
      .evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => /^\d+\.\d+\.\d+$/.test(value))
      );

    expect(versions.length).toBeGreaterThan(0);

    // Sort versions numerically, newest first.
    versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (
        let i = 0;
        i < Math.max(aParts.length, bParts.length);
        i++
      ) {
        const difference =
          (bParts[i] ?? 0) - (aParts[i] ?? 0);

        if (difference !== 0) {
          return difference;
        }
      }

      return 0;
    });

    pythonVersion = versions[0];

    console.log(
      `Newest available Python version: ${pythonVersion}`
    );

    await versionSelect.selectOption(pythonVersion);

    await expect(versionSelect).toHaveValue(pythonVersion);

    console.log(
      `Installing application with Python ${pythonVersion}`
    );

    await page.locator('#installButton').click();

    await expect(page.getByText(/setup completed/i)).toBeVisible({timeout: 120000,});
  });

  test('3. verify app appears on /sites', async ({ page }) => {
    await page.goto('/sites');

    const row = page
      .getByRole('row')
      .filter({ hasText: DOMAIN });

    await expect(row).toBeVisible();

    await expect(
      row.getByText(pythonVersion)
    ).toBeVisible();

    await row
      .getByRole('link', {
        name: 'Manage',
        exact: true,
      })
      .click();

    await expect(page).toHaveURL(
      `/website?domain=${DOMAIN}`
    );
  });

  test('4. verify app is responding', async ({ page }) => {
    const expected = `Hello World from Flask on port ${PORT}!`;
    const url = `https://${DOMAIN}/`;

    await page.goto(url);

    const locator = page.getByText(expected);

    const timeout = 90000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await locator.isVisible()) {
        break;
      }

      await page.waitForTimeout(1000);
      await page.reload();
    }

    await expect(locator).toBeVisible();

    console.log(
      `Python autoinstaller is fully working with Python ${pythonVersion}`
    );
  });

  // TODO: cover manager actions
});
