# CI & Debugging

> A CI failure should leave enough evidence that you can begin diagnosing it without first reproducing it locally.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26  
**Primary references:** [CI](https://playwright.dev/docs/ci), [Trace Viewer](https://playwright.dev/docs/trace-viewer), [test configuration](https://playwright.dev/docs/test-configuration), [retries](https://playwright.dev/docs/test-retries)

## The short version

A production-minded Playwright CI job should do four things well:

1. install the exact project dependencies and required browsers;
2. run the intended test configuration predictably;
3. preserve useful evidence when something fails;
4. make flaky outcomes visible rather than laundering them into green.

When a test passes locally and fails in CI, do not start by increasing every timeout. Start with the failure artifact and identify the first point where observed behavior diverged from expectation.

## A practical CI baseline

A minimal GitHub Actions job can look like this:

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

      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test

      - name: Upload Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

Treat this as a baseline, not a universal workflow. Your application may also need services, database setup, environment variables, authentication preparation, containers, deployment URLs, or a build step.

## Configure CI intentionally

A useful starting configuration is:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['line']]
    : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

This resembles Playwright's conservative CI guidance, but every setting should have a reason.

### `forbidOnly`

Fail CI if `test.only()` was accidentally committed.

### Retries

Retries can produce diagnostic evidence and help distinguish first-attempt failures from stable failures. They do not make the original failure irrelevant.

### Workers

Playwright's CI documentation recommends `workers: 1` as a stable starting point and suggests sharding across CI jobs when more parallelism is needed. Teams can deliberately raise worker count after proving their tests, data, services, and runner resources are parallel-safe.

### Trace

`trace: 'on-first-retry'` captures a trace for the first retry, limiting overhead while preserving deep evidence for failures that need another attempt.

## Trace Viewer should be your first CI debugger

Playwright traces can contain a timeline of actions, DOM snapshots, locator details, console messages, network activity, errors, attachments, and other execution context.

When a CI test fails:

1. open the trace from the failed/flaky run;
2. find the first action where actual state diverges from expected state;
3. inspect the locator and actionability information;
4. inspect relevant requests/responses and console errors;
5. compare the visible page state with what the test assumed;
6. form a specific hypothesis before changing the test.

Do not begin with the last timeout line merely because it is where Playwright finally gave up. The cause may have occurred several actions earlier.

## Trace vs screenshot vs video

These artifacts answer different questions.

| Artifact | Best for |
| --- | --- |
| Trace | Interactive investigation of actions, DOM, network, console, timing, locators |
| Screenshot | Fast view of visible state at a key failure point |
| Video | Understanding motion, transitions, timing, or an unexpected journey |
| HTML report | Suite/test overview, retries, attachments, errors, navigation |
| Logs/attachments | Application-specific evidence not visible to Playwright automatically |

**Engineering recommendation:** prefer traces as the primary browser-debugging artifact. Add video when it answers a real question; recording everything forever can create large storage and review costs.

## Preserve the evidence CI generated

A failed run that deletes its trace and report at job teardown forces engineers to reproduce history.

Upload artifacts even when tests fail:

```yaml
- name: Upload Playwright report
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ github.run_attempt }}
    path: playwright-report/
    retention-days: 14
```

If your configuration stores raw output separately, preserve that directory too when it contains traces, screenshots, videos, or custom attachments.

Choose retention according to your team's debugging cadence, storage limits, and compliance requirements.

## Make application evidence part of the test result

Browser evidence may not be enough for distributed systems.

Useful custom attachments can include:

- generated record IDs;
- request correlation IDs;
- test account/tenant identifiers;
- sanitized application logs;
- feature-flag state;
- random seed;
- environment/build version;
- backend job IDs.

Example:

```ts
await testInfo.attach('order-context', {
  body: JSON.stringify({ orderId, tenantId }, null, 2),
  contentType: 'application/json',
});
```

Never attach secrets or sensitive customer data merely for convenience.

## “Passes locally, fails in CI” is a comparison problem

The environments differ somehow. Find the relevant difference.

Common categories:

- CPU/memory pressure;
- worker count and concurrency;
- environment variables/secrets;
- application version or deployment state;
- seeded database contents;
- authentication state;
- browser/project configuration;
- viewport/device settings;
- locale/timezone;
- fonts and rendering environment;
- network access/proxy behavior;
- service availability;
- feature flags;
- third-party rate limits;
- filesystem paths/permissions;
- case sensitivity;
- clock assumptions.

See [Passes Locally, Fails in CI](passes-locally.md) for the diagnostic workflow.

## Do not diagnose CI slowness with arbitrary sleeps

A slower runner often exposes an existing race.

Bad:

```ts
await page.getByRole('button', { name: 'Generate' }).click();
await page.waitForTimeout(10_000);
```

Better:

```ts
await page.getByRole('button', { name: 'Generate' }).click();
await expect(page.getByRole('status')).toHaveText('Report ready');
```

If the valid operation genuinely requires a longer timeout, configure that timeout around the meaningful operation or assertion and document why.

## Retries: preserve the signal

Playwright can categorize outcomes as passed, flaky, or failed when retries are enabled.

That distinction is valuable. Do not reduce CI to a final green/red bit.

Track recurring flaky tests. A test that passes only after retry is telling you something about state, timing, infrastructure, data, or the product.

Useful questions after a retry succeeds:

- What changed between attempts?
- Did the failed attempt create state used by the retry?
- Did a service warm up?
- Did another worker release a resource?
- Did a background job finish?
- Did a transient dependency recover?

## Parallelism: faster is not free

Increasing workers can reduce runtime but increase contention for:

- CPU and memory;
- database connections;
- shared accounts;
- test records;
- external rate limits;
- ports;
- queues;
- file paths;
- constrained environments.

Before raising CI parallelism, prove that test data and server-side state are isolated. Browser contexts isolate browser state; they do not isolate your backend.

## Sharding vs more workers

Playwright supports sharding a suite across multiple machines/jobs with `--shard=x/y`.

Conceptually:

```text
CI job 1 → npx playwright test --shard=1/4
CI job 2 → npx playwright test --shard=2/4
CI job 3 → npx playwright test --shard=3/4
CI job 4 → npx playwright test --shard=4/4
```

Sharding can scale horizontally while keeping each runner's worker count conservative.

**Context dependent:** the right balance depends on suite size, runner cost, test duration distribution, shared environment capacity, and data isolation.

## Resource pressure can masquerade as flakiness

Symptoms include:

- failures appearing only at high worker counts;
- browser crashes;
- navigation timeouts across unrelated tests;
- random tests becoming slow;
- services becoming unavailable under suite load.

Run a controlled experiment: reduce workers while keeping everything else constant. If failures disappear, do not immediately declare the tests fixed. Determine which shared resource was saturated.

## Keep CI and local configuration comparable

Avoid maintaining an entirely different test architecture for CI.

Differences are sometimes necessary, but make them explicit:

```ts
const isCI = !!process.env.CI;

export default defineConfig({
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
});
```

If CI uses a different base URL, browser, locale, auth strategy, feature set, or data source, that difference should be easy to discover from configuration.

## Reproduce CI deliberately

When local reproduction is useful, reproduce the relevant CI dimension instead of simply rerunning the test repeatedly.

Examples:

```bash
# Same browser/project
npx playwright test path/to/test.spec.ts --project=chromium

# Serial execution
npx playwright test path/to/test.spec.ts --workers=1

# Repeat to expose intermittent behavior
npx playwright test path/to/test.spec.ts --repeat-each=20

# Run with retries to compare attempts
npx playwright test path/to/test.spec.ts --retries=2
```

Also reproduce environment variables, locale/timezone, application build, test data, and service versions when those are part of the hypothesis.

## CI review checklist

Before calling a Playwright pipeline production-ready, ask:

- Are dependencies installed deterministically?
- Are required Playwright browsers/system dependencies installed?
- Does CI reject committed `test.only()`?
- Are traces available for useful failure/retry cases?
- Are reports and relevant artifacts retained after failure?
- Can an engineer identify the application build/environment tested?
- Are secrets kept out of reports and attachments?
- Are retries visible as flaky outcomes rather than silently accepted?
- Is worker count intentional?
- Is server-side test data safe under that concurrency?
- If sharded, can results/artifacts be understood per shard?
- Can CI-specific configuration differences be found quickly?

## Related field guides

- [Passes Locally, Fails in CI](passes-locally.md)
- [GitHub Actions Patterns](github-actions.md)
- [Why Is My Playwright Test Flaky?](../reliable-test-design/flakiness-diagnostic.md)
- [Fixtures, Authentication & Test Data](../fixtures-auth-test-data/README.md)

## Official references

- [Playwright: Continuous Integration](https://playwright.dev/docs/ci)
- [Playwright: Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Playwright: Test Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright: Retries](https://playwright.dev/docs/test-retries)
- [Playwright: Parallelism](https://playwright.dev/docs/test-parallel)
- [Playwright: Sharding](https://playwright.dev/docs/test-sharding)
- [Playwright: TestInfo](https://playwright.dev/docs/api/class-testinfo)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26. GitHub Actions examples are illustrative and should be pinned/updated according to your organization's dependency policy.
