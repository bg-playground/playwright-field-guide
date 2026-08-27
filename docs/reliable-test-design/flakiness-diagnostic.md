# Why Is My Playwright Test Flaky?

> A field diagnostic for tests that fail sometimes, pass on retry, or behave differently in CI.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26

## Start with evidence, not another wait

When a test flakes, resist the fastest-looking fixes:

```ts
// ❌ Typical flake camouflage.
await page.waitForTimeout(3000);
```

```ts
// ❌ Also camouflage if the root cause is unknown.
test.describe.configure({ retries: 5 });
```

A flaky test usually has an uncontrolled assumption. Your job is to identify it.

## 60-second triage

Ask these questions in order:

1. **Does the failure happen only when other tests run?**  
   Suspect shared data, leaked state, resource contention, or order dependence.

2. **Does it fail because an element is missing, covered, moving, or disabled?**  
   Suspect synchronization, locator ambiguity, animation, or a real product state issue.

3. **Does an assertion inspect state immediately after an action?**  
   Replace snapshot-style checks with a web-first assertion where appropriate.

4. **Does the test contain `waitForTimeout()`?**  
   Determine the actual condition that sleep is standing in for.

5. **Does it fail only under parallel execution?**  
   Suspect shared accounts, records, ports, files, queues, or environment limits.

6. **Does it fail only in CI?**  
   Inspect the trace first. Then compare environment, data, resources, browser/project configuration, and external dependencies.

7. **Does retry make it pass?**  
   Treat that as evidence, not resolution. Ask what changed between attempts.

## Symptom → likely cause

| Symptom | Investigate first |
| --- | --- |
| `Timeout ... exceeded` around an action | Locator, actionability, wrong state, slow dependency |
| Element found locally but not CI | Environment/data difference, timing, viewport/project difference |
| Strict-mode / multiple-match locator failure | Ambiguous locator |
| Passes alone, fails in suite | Shared state or resource contention |
| Passes serially, fails in parallel | Server-side data collision or constrained resource |
| First attempt fails, retry passes | Race, transient dependency, cold start, leaked/shared state |
| Text/value occasionally stale | Missing postcondition or eventual consistency |
| Navigation intermittently wrong | Race between action and expected navigation/state |
| Screenshot differs unpredictably | Animation, font/rendering/environment, dynamic content |
| Failure moves between unrelated tests | Environment/resource instability or shared global state |

## Decision tree

### A. Does the test own its state?

**No** → isolate it first.

Look for:

- a common test user modified by multiple tests,
- records with fixed names or IDs,
- tests depending on data left by previous tests,
- shared shopping carts, inboxes, queues, or workspaces,
- cleanup that may race with another worker.

Browser contexts isolate browser state. They do not magically isolate the application's database.

### B. Is the test waiting for time instead of behavior?

**Yes** → replace elapsed time with the actual condition.

Bad:

```ts
await page.getByRole('button', { name: 'Generate report' }).click();
await page.waitForTimeout(10_000);
await page.getByText('Report ready').click();
```

Better:

```ts
await page.getByRole('button', { name: 'Generate report' }).click();
await expect(page.getByText('Report ready')).toBeVisible();
```

If report generation is genuinely asynchronous and the UI does not expose a reliable state, determine which observable signal belongs in the test: UI status, response, polling result, websocket-driven state, or another product-specific condition.

### C. Is the assertion retrying?

Bad:

```ts
expect(await page.getByRole('alert').isVisible()).toBe(true);
```

Better:

```ts
await expect(page.getByRole('alert')).toBeVisible();
```

Playwright's web-first assertions retry; a plain boolean assertion evaluates the value you captured at that instant.

### D. Is the locator actually unique and resilient?

A locator that happens to find the right element on your machine is not necessarily a good locator.

Check whether it:

- represents how a user identifies the element,
- uniquely identifies the intended target,
- depends unnecessarily on DOM structure,
- matches hidden or duplicate UI,
- changes with responsive layout.

Locator strategy gets its own field guide in PR 3 because weak locators are one of the most common sources of apparent timing problems.

### E. Is an external system controlling the outcome?

Examples:

- payment sandbox,
- email provider,
- analytics endpoint,
- third-party API,
- remote feature flag,
- rate-limited service.

Ask whether that integration is part of what this particular test is supposed to validate.

If not, controlling or mocking the dependency may make the test narrower and more deterministic. If yes, retain the integration and treat its availability and test data as explicit parts of the test environment.

## “It passes locally but fails in CI”

Do not start by increasing every timeout.

### First: inspect the trace

Playwright recommends Trace Viewer for CI debugging. A trace can show the action timeline, DOM snapshots, locator resolution, console output, network activity, errors, and other context around the failure.

A productive investigation is:

1. Find the first point where observed behavior differs from expectation.
2. Inspect the locator and actionability state at that point.
3. Check relevant requests and responses.
4. Compare the application's visible state with the state the test assumed.
5. Only then decide whether the defect belongs to the test, product, environment, or dependency.

### Then compare environments

Look for differences in:

- environment variables and secrets,
- seeded data,
- authentication state,
- CPU/memory pressure,
- worker count,
- browser/project configuration,
- viewport/device emulation,
- locale/timezone,
- network access,
- service versions,
- and feature flags.

A slower CI machine can expose a race, but “CI is slower” is not itself a root cause.

## “It passes on retry”

Playwright can classify a test that fails initially and passes on retry as flaky. Keep that information visible.

Ask what the retry changed:

- Was data created during the failed attempt?
- Did a service finish warming up?
- Did an asynchronous job complete?
- Did a competing worker release a shared resource?
- Did a third-party request recover?
- Did the second run get a different random value?

The retry is often an experiment you did not design. Learn from it.

## “Should I just increase the timeout?”

Sometimes.

**Context dependent:** a longer timeout is legitimate when the expected operation can correctly take longer than the default under supported conditions. Examples may include a known long-running workflow or a deliberately slow environment.

A longer timeout is suspicious when it compensates for not knowing what completion means.

Before changing a timeout, answer:

> What valid behavior requires more time, and what condition will eventually prove success?

## “Should I use `force: true`?”

Usually not as a flake fix.

Playwright actionability checks exist to prevent interactions that a real user could not successfully perform. Bypassing them can turn a useful failure into a misleading pass.

Use `force` only when the test intentionally needs behavior that warrants bypassing the relevant checks and you understand which check you are bypassing.

## Flake investigation template

Capture this information when a flaky test is worth tracking:

```text
Test:
First failing step:
Failure mode:
Reproduces alone? yes/no
Reproduces serially? yes/no
Reproduces in parallel? yes/no
Local only / CI only / both:
Retry result:
Shared server-side state:
Fixed waits present:
External dependencies:
Trace reviewed:
Observed state at failure:
Expected state:
Current hypothesis:
Smallest experiment to test hypothesis:
```

This keeps a team from repeatedly “fixing” the same flake with unrelated timeout changes.

## Anti-pattern: flake budget by retries

A suite with 500 tests and generous retries can look green while consuming large amounts of CI time and producing low confidence.

Track at least:

- tests flaky on retry,
- repeated offenders,
- time lost to retries,
- and whether failures cluster around a shared dependency or environment.

**Engineering recommendation:** a flaky test is a defect in the delivery signal even when the product behavior is correct.

## When the test is not the bug

Do not assume every intermittent failure belongs to automation.

A good Playwright test may reveal:

- a real race condition,
- delayed persistence,
- inaccessible or covered controls,
- inconsistent API responses,
- stale caching,
- session leakage,
- or a responsive-layout defect.

The goal is not a green test suite at any cost. The goal is a trustworthy signal.

## Related field guides

- [Reliable Test Design](README.md)
- Locator Strategy *(v0.1 PR 3)*
- Fixtures, Authentication & Test Data *(v0.1 PR 4)*
- CI & Debugging *(v0.1 PR 6)*

## Official references

- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright: Auto-waiting](https://playwright.dev/docs/actionability)
- [Playwright: Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright: Retries](https://playwright.dev/docs/test-retries)
- [Playwright: Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Playwright: Debugging Tests](https://playwright.dev/docs/debug)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26.