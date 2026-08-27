# Passes Locally, Fails in CI

> Do not ask “Why is CI weird?” Ask “Which relevant input differs between these executions?”

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26

## 60-second triage

When a test fails only in CI:

1. **Open the trace.** Find the first behavioral divergence, not merely the final timeout.
2. **Check the failing locator/action.** Was the element absent, duplicated, hidden, disabled, covered, or in a different state?
3. **Check network and console evidence.** Did a request fail or return different data?
4. **Check concurrency.** Does the failure disappear with one worker?
5. **Check state.** Is CI using different accounts, records, seeds, flags, or authentication?
6. **Check configuration.** Browser/project, viewport, locale, timezone, base URL, environment variables.
7. **Check resources.** CPU, memory, database/service capacity, rate limits.
8. **Form one hypothesis and change one variable.**

## Decision tree

```text
Does the trace show the application in the wrong state?
├─ yes
│  ├─ request/data differs? → environment, seed, backend, auth, flags
│  ├─ another test changed state? → isolation/concurrency
│  └─ state arrives late? → synchronization or backend latency
└─ no
   ├─ locator resolves differently? → DOM/accessibility/viewport/data difference
   ├─ actionability differs? → overlay, animation, disabled state, responsive UI
   ├─ browser crashes/slows broadly? → resource pressure
   └─ visual-only difference? → fonts/rendering/platform/dynamic content
```

## Step 1: find the first divergence

The last error may be:

```text
Timeout 5000ms exceeded while waiting for expect(locator).toBeVisible()
```

But the cause may be an earlier failed API response, wrong account, dismissed dialog, or navigation to an unexpected page.

Use the trace timeline to work backward until the expected and observed stories first separate.

Write down:

```text
Expected:
Observed:
First divergent action:
Evidence:
```

That turns “CI flake” into a testable hypothesis.

## Step 2: classify the failure

### State difference

Examples:

- expected order does not exist;
- user lacks permission;
- feature flag differs;
- test account already contains mutable data;
- auth state expired;
- database seed is stale.

Investigate environment and test-data ownership.

### Timing/synchronization difference

Examples:

- UI is still loading;
- background job has not completed;
- eventual consistency takes longer under CI load;
- action occurs before a meaningful state transition.

Do not automatically add a fixed sleep. Identify the observable completion condition.

### Concurrency difference

Examples:

- two tests edit the same account;
- cleanup deletes another worker's data;
- unique constraint collides on fixed test names;
- environment supports fewer simultaneous sessions than the suite creates.

Experiment:

```bash
npx playwright test path/to/test.spec.ts --workers=1
```

If this stabilizes the test, investigate shared resources rather than permanently assuming serial execution is the only answer.

### Configuration difference

Compare:

- browser and browser version;
- Playwright project;
- viewport/device;
- locale/timezone;
- permissions;
- base URL;
- environment variables;
- feature flags;
- proxy/network configuration.

Make these differences visible in config rather than relying on tribal knowledge.

### Resource difference

A CI runner may have less CPU/memory than a developer machine, while the shared test environment may also be handling several jobs.

Broad symptoms across unrelated tests often point to infrastructure pressure rather than dozens of independent selector bugs.

## Step 3: inspect the locator in context

If the failure says an element is missing, ask:

- Is the page actually the expected page?
- Is the correct user logged in?
- Did the expected data load?
- Does the locator match zero elements or multiple elements?
- Is responsive UI rendering another variant?
- Did accessible naming differ because the DOM/content changed?

Do not weaken a locator until you know the target exists in the intended state.

## Step 4: inspect network evidence

A UI timeout can be a backend failure wearing a browser-test costume.

Look for:

- 401/403 responses;
- 404s from incorrect environment data;
- 429 rate limiting;
- 5xx responses;
- stalled requests;
- CORS/proxy differences;
- third-party failures;
- payloads that differ from local execution.

If your system provides correlation IDs, attach them to the test result so backend investigation can begin from the CI artifact.

## Step 5: compare environment identity

A useful CI run should make it easy to answer:

```text
Commit/build:
Target environment:
Playwright version:
Node version:
Browser/project:
Worker count:
Shard:
Locale/timezone:
Feature configuration:
Test-data namespace:
```

Do not expose secrets while recording this metadata.

## Step 6: reproduce the relevant dimension

Bad reproduction strategy:

> Run it locally until it fails.

Better experiments isolate a suspected difference.

### Suspect concurrency

```bash
npx playwright test tests/checkout.spec.ts --workers=1
npx playwright test tests/checkout.spec.ts --workers=4
```

### Suspect intermittent state

```bash
npx playwright test tests/checkout.spec.ts --repeat-each=20
```

### Suspect project/browser

```bash
npx playwright test tests/checkout.spec.ts --project=chromium
```

### Suspect order dependence

Run the test alone, then with the files that normally precede/overlap it. Better yet, inspect shared state so the investigation does not depend only on execution ordering.

## Step 7: change one variable

If you simultaneously:

- double the timeout;
- disable parallelism;
- change the locator;
- add a retry;
- and reset test data,

then a green run teaches you almost nothing.

Prefer small experiments:

> Hypothesis: two workers are editing the same server-side account.  
> Experiment: assign unique accounts while leaving timing and worker count unchanged.  
> Result: ...

This is debugging, not superstition.

## Common false fixes

### “CI is slow, add 10 seconds”

May hide a race and lengthen every run.

### “Use `.first()` because strictness fails in CI”

May select the wrong responsive/duplicate control.

### “Force-click it”

May bypass evidence that a spinner, overlay, or disabled state is real.

### “Retry five times”

May turn a deterministic race into an expensive green build.

### “Run everything serially forever”

Can be a valid capacity decision, but should not substitute for understanding shared-state collisions.

## CI-only visual failures

Screenshot tests can differ because of:

- operating system;
- browser version;
- fonts;
- rendering libraries;
- viewport/device scale;
- animations;
- dynamic timestamps/content;
- locale;
- missing assets.

Visual baselines should be generated and compared in a controlled, documented environment. Do not casually update snapshots merely because CI differs.

## CI-only authentication failures

Check:

- whether storage state exists and is generated in the intended environment;
- whether credentials/secrets are available to the event type;
- whether the account allows concurrent sessions;
- whether session cookies are environment/domain specific;
- whether authentication expires during long runs;
- whether multiple workers mutate the same account.

See the [Authentication Decision Guide](../fixtures-auth-test-data/authentication-decision-guide.md).

## Diagnostic capture template

```text
Test:
CI run / attempt:
Commit/build:
Environment:
Project/browser:
Workers/shard:
First divergent action:
Expected state:
Observed state:
Relevant network/console evidence:
Shared server-side state:
Retry outcome:
Reproduces locally:
Reproduces with CI worker count:
Trace reviewed:
Current hypothesis:
Single-variable experiment:
Result:
```

## When the product is the failure

A CI-only test failure can expose a real production-like defect:

- race conditions visible only under load;
- slow persistence;
- inaccessible responsive controls;
- backend capacity limits;
- stale caches;
- inconsistent feature rollout;
- session collisions.

Do not optimize for making the automation green. Optimize for determining which system violated the expected behavior.

## Related field guides

- [CI & Debugging](README.md)
- [GitHub Actions Patterns](github-actions.md)
- [Why Is My Playwright Test Flaky?](../reliable-test-design/flakiness-diagnostic.md)
- [Test Data Patterns](../fixtures-auth-test-data/test-data-patterns.md)

## Official references

- [Playwright: Continuous Integration](https://playwright.dev/docs/ci)
- [Playwright: Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Playwright: Debugging Tests](https://playwright.dev/docs/debug)
- [Playwright: Parallelism](https://playwright.dev/docs/test-parallel)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26.
