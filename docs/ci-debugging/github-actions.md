# GitHub Actions Patterns for Playwright

> Build the smallest pipeline that runs deterministically and preserves enough evidence to explain failure.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26

## Baseline pull-request workflow

```yaml
name: Playwright Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

This assumes the tests can reach the application. Add build/start/deploy/service steps according to the system under test.

## Why `npm ci`?

For npm projects with a committed lockfile, `npm ci` installs from the lockfile and is a strong default for deterministic CI dependency installation.

The Field Guide recommends lockfile-driven CI so local and CI dependency resolution do not drift unexpectedly.

## Browser installation

Playwright's CI guidance uses:

```bash
npx playwright install --with-deps
```

This installs required browsers and operating-system dependencies for the Playwright version in the project.

## Keep the workflow and package versions aligned

Your installed Playwright package and browser binaries belong together. Avoid globally installing a different Playwright version in CI.

Use the project's dependency:

```bash
npx playwright test
```

rather than inventing a separate CI-only toolchain.

## Preserve reports after failure

A test step returning non-zero should not prevent diagnostic artifact upload.

```yaml
- name: Upload Playwright report
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ github.run_attempt }}
    path: playwright-report/
    retention-days: 14
```

`!cancelled()` allows the artifact step to run after test failure while avoiding unnecessary work for a cancelled job.

**Context dependent:** some teams prefer `always()`. Choose based on whether artifacts from cancelled/incomplete runs are useful.

## Preserve raw test output when useful

If your configuration stores traces/screenshots/videos under `test-results/`, preserve it separately when the HTML report does not contain everything your team needs.

```yaml
- name: Upload raw test results
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: test-results-${{ github.run_attempt }}
    path: test-results/
    retention-days: 14
    if-no-files-found: ignore
```

## Do not upload secrets

Before attaching logs, environment dumps, network payloads, or storage state, consider whether they contain:

- credentials;
- cookies/tokens;
- API keys;
- customer data;
- private URLs;
- regulated information.

Diagnostic convenience does not justify leaking sensitive data into CI artifacts.

## Configuration baseline

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

### Why not enable video by default here?

Video can be useful, but traces usually provide richer debugging context. Add video when your failure modes benefit from seeing motion/transitions and the storage cost is justified.

Example:

```ts
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

## Environment variables

Keep configuration explicit:

```yaml
- name: Run Playwright tests
  env:
    BASE_URL: ${{ vars.TEST_BASE_URL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: npx playwright test
```

Then consume only what the test configuration needs.

Do not print secret values for debugging.

## Pull requests from forks

GitHub intentionally restricts secrets for untrusted fork pull requests. If public contributors can open PRs, design your test workflow so untrusted code does not automatically receive sensitive credentials.

This may mean separating:

- public, credential-free validation;
- trusted environment E2E runs;
- maintainer-triggered workflows.

Security boundaries should not be weakened merely to make E2E convenient.

## Sharding across jobs

For larger suites, Playwright can shard execution across CI jobs.

```yaml
strategy:
  fail-fast: false
  matrix:
    shardIndex: [1, 2, 3, 4]
    shardTotal: [4]

steps:
  # checkout/setup/install omitted

  - name: Run shard
    run: >-
      npx playwright test
      --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

Give each shard's artifacts a unique name:

```yaml
- name: Upload shard report
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ matrix.shardIndex }}
    path: playwright-report/
```

For a polished large-suite pipeline, consider Playwright's blob reporter and report merging rather than treating several independent HTML reports as one suite result.

## Blob reports for sharded runs

Playwright supports a blob reporter designed to contain test-run information that can later be merged.

A shard can run with blob reporting configured, upload its blob report, and a later job can merge reports.

The exact workflow deserves executable coverage in the Field Guide's living-documentation milestone rather than a long copy-paste block that we cannot continuously validate yet.

See the official [Merge reports CLI](https://playwright.dev/docs/test-cli#merge-reports) and [Reporters](https://playwright.dev/docs/test-reporters) documentation before implementing this pattern.

## Worker count vs matrix size

Do not multiply parallelism accidentally.

Four shards with four workers each may create up to sixteen concurrent workers against the same test environment.

Ask whether the backend, accounts, database, and third-party dependencies can support that load.

Horizontal scaling is still concurrency.

## Cache carefully

Caching npm's download cache through `actions/setup-node` can improve install speed while preserving `npm ci` behavior.

Be more cautious about caching:

- `node_modules`;
- browser installation directories;
- authentication state;
- generated test data.

A cache that restores stale mutable state can create difficult CI-only failures.

Optimize only after measuring the bottleneck.

## Build once or per shard?

**Context dependent.**

If tests run against a deployed environment, shards may only need the test package and browser dependencies.

If each job starts the application locally, every shard may repeat build/start cost. Alternatives include artifacts, containers, or a separate deployment job.

Choose based on isolation, runtime, and pipeline complexity rather than chasing the fewest YAML lines.

## `webServer` can simplify local-app CI

Playwright configuration can start a local web server before tests:

```ts
export default defineConfig({
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

This keeps application startup behavior close to test configuration.

For multi-service systems, containers or workflow service orchestration may be more appropriate.

## Timeouts at the right layer

GitHub job timeout:

```yaml
timeout-minutes: 30
```

prevents a hung workflow from consuming a runner indefinitely.

Playwright test/assertion/action timeouts solve different problems. Do not use a giant job timeout as a substitute for test-level diagnostics, or giant test timeouts as a substitute for workflow control.

## CI metadata worth recording

Useful non-secret metadata includes:

```text
commit SHA
run ID / attempt
Playwright version
Node version
project/browser
worker count
shard index/total
target environment/build
```

This can dramatically shorten “what exactly ran?” investigations.

## Scheduled runs

A scheduled suite can detect environment drift or failures that pull-request coverage misses.

```yaml
on:
  schedule:
    - cron: '0 6 * * *'
```

Do not let scheduled runs become an ignored wall of red. Define ownership and notification behavior before adding them.

## A useful pipeline progression

### Stage 1 — trustworthy baseline

```text
checkout → setup Node → npm ci → install browsers → test → upload evidence
```

### Stage 2 — application integration

```text
build/start or deploy → seed/prepare → test → evidence
```

### Stage 3 — scale

```text
shards → isolated data → blob reports → merged report
```

### Stage 4 — operational maturity

```text
flake tracking → scheduled validation → trend data → release/version freshness
```

Earn each layer through a measured need.

## Review checklist

- Is dependency installation lockfile-driven?
- Are browsers installed from the project's Playwright version?
- Are artifacts uploaded after failures?
- Are artifact names unique across shards/attempts?
- Are secrets excluded from artifacts/logs?
- Does the workflow handle untrusted PRs safely?
- Is total concurrency understood across matrix × workers?
- Are caches immutable/safe rather than convenient shared state?
- Is `test.only()` rejected in CI?
- Are retries visible?
- Can engineers identify the exact build/environment tested?

## Related field guides

- [CI & Debugging](README.md)
- [Passes Locally, Fails in CI](passes-locally.md)
- [Test Data Patterns](../fixtures-auth-test-data/test-data-patterns.md)

## Official references

- [Playwright: Continuous Integration](https://playwright.dev/docs/ci)
- [Playwright: Sharding](https://playwright.dev/docs/test-sharding)
- [Playwright: Reporters](https://playwright.dev/docs/test-reporters)
- [Playwright: Web server](https://playwright.dev/docs/test-webserver)
- [GitHub Actions documentation](https://docs.github.com/actions)

---

**Verification note:** Playwright-specific guidance was reviewed against official documentation on 2026-08-26. GitHub Actions major versions shown here were current for the baseline used by this guide; dependency automation/freshness validation is planned for v0.1 PR 9.
