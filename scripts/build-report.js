#!/usr/bin/env node
//
// Reads a Playwright JSON reporter output file and writes a markdown
// results table into a README.md, between AUTOMATED-RESULTS markers.
//
// If GITHUB_TOKEN is set in the environment and a repo is given, this also
// keeps a single persistent GitHub issue in sync per script: opens one on
// the first failure, updates the same issue on repeat failures (never
// opens a second one), and closes it automatically once tests pass again.
//
// Usage: node build-report.js <results.json> <README.md> <label> [owner/repo]

const fs = require('fs');

const [, , jsonPath, readmePath, label, repo] = process.argv;

if (!jsonPath || !readmePath || !label) {
  console.error('Usage: build-report.js <results.json> <README.md> <label> [owner/repo]');
  process.exit(1);
}

const START = '<!-- AUTOMATED-RESULTS:START -->';
const END = '<!-- AUTOMATED-RESULTS:END -->';

const STATUS_ICON = {
  passed: '✅',
  failed: '❌',
  timedOut: '⏱️',
  interrupted: '⚠️',
  skipped: '⏭️',
};

function stripAnsi(str) {
  return String(str).replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

function escapeCell(str) {
  return String(str).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function collectSpecs(suite, filePath, titlePath, rows) {
  const file = suite.file || filePath;
  for (const spec of suite.specs || []) {
    const fullTitle = [...titlePath, spec.title].join(' › ');
    for (const test of spec.tests || []) {
      // skip the internal auth-setup project; only report the real suite
      if (test.projectName && test.projectName !== 'tests') continue;

      const results = test.results || [];
      const last = results[results.length - 1];
      const status = last ? last.status : (test.status || 'skipped');
      const duration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
      let error = '';
      if (status !== 'passed' && status !== 'skipped') {
        const failedResult = results.find(r => r.error) || last;
        if (failedResult && failedResult.error) {
          error = stripAnsi(failedResult.error.message || failedResult.error.value || '').split('\n')[0];
        }
      }
      rows.push({
        file: file.replace(/^.*tests[\\/]/, ''),
        title: fullTitle,
        status,
        duration,
        error,
      });
    }
  }
  for (const child of suite.suites || []) {
    collectSpecs(child, file, [...titlePath, suite.title].filter(Boolean), rows);
  }
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error(`Could not read/parse ${jsonPath}: ${err.message}`);
  process.exit(1);
}

const rows = [];
for (const suite of raw.suites || []) {
  collectSpecs(suite, suite.file, [], rows);
}

const passed = rows.filter(r => r.status === 'passed').length;
const skipped = rows.filter(r => r.status === 'skipped').length;
const failed = rows.filter(r => r.status !== 'passed' && r.status !== 'skipped').length;
const total = rows.length;

const durationMs = (raw.stats && raw.stats.duration) || rows.reduce((s, r) => s + r.duration, 0);
const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

const overallIcon = failed > 0 ? '❌' : '✅';
const overallLabel = failed > 0 ? `${failed} failed` : 'All passed';

const failedRows = rows.filter(r => r.status !== 'passed' && r.status !== 'skipped');

let failuresTable = '';
if (failedRows.length > 0) {
  failuresTable += `| Test file | Test | Status | Error |\n`;
  failuresTable += `|---|---|---|---|\n`;
  for (const r of failedRows) {
    failuresTable += `| ${escapeCell(r.file)} | ${escapeCell(r.title)} | ${STATUS_ICON[r.status] || r.status} | ${escapeCell(r.error).slice(0, 200)} |\n`;
  }
}

let md = `${START}\n`;
md += `### Latest ${label} run\n\n`;
md += `**Last run:** ${now}  \n`;
md += `**Result:** ${overallIcon} ${overallLabel} — ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total) in ${formatDuration(durationMs)}\n\n`;

if (failedRows.length > 0) {
  md += `#### ❌ Failures\n\n${failuresTable}\n`;
}

md += `<details>\n<summary>Full results (${total} tests)</summary>\n\n`;
md += `| Test file | Test | Status | Duration |\n`;
md += `|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${escapeCell(r.file)} | ${escapeCell(r.title)} | ${STATUS_ICON[r.status] || r.status} | ${formatDuration(r.duration)} |\n`;
}
md += `\n</details>\n`;
md += `${END}`;

let readme = '';
try {
  readme = fs.readFileSync(readmePath, 'utf8');
} catch {
  readme = '';
}

if (readme.includes(START) && readme.includes(END)) {
  const before = readme.slice(0, readme.indexOf(START));
  const after = readme.slice(readme.indexOf(END) + END.length);
  readme = before + md + after;
} else {
  const sep = readme.endsWith('\n') || readme === '' ? '' : '\n';
  readme = `${readme}${sep}\n## Automated Test Results\n\n${md}\n`;
}

fs.writeFileSync(readmePath, readme);

console.log(`Report written to ${readmePath}: ${passed} passed, ${failed} failed, ${skipped} skipped`);

// -- keep a single persistent GitHub issue in sync for this script -------

async function ghRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'openpanel-tests-runner',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} -> ${res.status}: ${data && data.message}`);
  }
  return data;
}

async function syncGithubIssue() {
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return;

  const scriptLabel = label.toLowerCase();
  const failureLabel = 'automated-test-failure';
  const title = `❌ ${label} automated tests failing`;
  const base = `https://api.github.com/repos/${repo}`;

  const open = await ghRequest(
    `${base}/issues?state=open&labels=${encodeURIComponent(`${failureLabel},${scriptLabel}`)}&per_page=5`
  );
  const existing = Array.isArray(open) ? open.find(i => !i.pull_request) : null;

  if (failed > 0) {
    const readmeUrl = `https://github.com/${repo}/blob/main/${scriptLabel}/README.md`;
    const body =
      `**Last run:** ${now}\n` +
      `**Result:** ${failed} failed, ${passed} passed, ${skipped} skipped (${total} total)\n\n` +
      `${failuresTable}\n` +
      `Full results: ${readmeUrl}`;

    if (existing) {
      await ghRequest(`${base}/issues/${existing.number}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      });
      await ghRequest(`${base}/issues/${existing.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: `Still failing as of ${now}.` }),
      });
      console.log(`Updated existing issue #${existing.number}`);
    } else {
      const created = await ghRequest(`${base}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title, body, labels: [failureLabel, scriptLabel] }),
      });
      console.log(`Opened issue #${created.number}`);
    }
  } else if (existing) {
    await ghRequest(`${base}/issues/${existing.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: `✅ All tests passing again as of ${now}.` }),
    });
    await ghRequest(`${base}/issues/${existing.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' }),
    });
    console.log(`Closed issue #${existing.number}`);
  }
}

syncGithubIssue()
  .catch(err => console.error(`GitHub issue sync failed: ${err.message}`))
  .finally(() => process.exit(failed > 0 ? 1 : 0));
