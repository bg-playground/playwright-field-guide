# Reliable Test Design

> Reliable Playwright tests wait for **meaningful conditions**, own their state, and fail for useful reasons.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26  
**Primary references:** [Playwright best practices](https://playwright.dev/docs/best-practices), [auto-waiting](https://playwright.dev/docs/actionability), [assertions](https://playwright.dev/docs/test-assertions), [retries](https://playwright.dev/docs/test-retries)

## The short version

Most flaky browser tests are not random. They are deterministic tests with an uncontrolled input: time, shared state, network behavior, data, environment, or an ambiguous UI condition.

A useful debugging question is therefore not:

> How do I make this test pass more often?

It is:

> What condition does this test assume without proving?

Use this order when designing or repairing a test:

1. Give the test independent state.
2. Express interactions through resilient locators.
3. Let Playwright's actionability checks synchronize actions.
4. Assert the user-visible condition that proves the operation completed.
5. Control external dependencies that are outside the purpose of the test.
6. Use retries to expose instability, not to redefine instability as success.
7. Diagnose failures with traces and artifacts before adding waits.

## 1. Test isolation is reliability infrastructure

**Official Playwright guidance:** tests should be isolated from one another. Playwright creates a separate browser context for each test by default, providing independent cookies, local storage, session storage, and related browser state.

Isolation makes failures reproducible. A test should not require another test to run first, and a previous test should not be able to poison the next one.

### Avoid test-order dependencies

```ts
// ❌ The second test depends on the first test having mutated shared state.
test('create customer', async ({ page }) => {
  // ...
});

test('edit that customer', async ({ page }) => {
  // Assumes the previous test created it.
});
```

Prefer each test to establish the state it needs, often through an API, fixture, or data helper when UI setup is not what the test is trying to prove.

```ts
// ✅ State belongs to this test.
test('edit customer', async ({ page, request }) => {
  const customer = await createCustomer(request);

  await page.goto(`/customers/${customer.id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  // ...
});
```

**Engineering recommendation:** treat shared mutable accounts, records, queues, feature flags, and environments as concurrency hazards. Browser-context isolation cannot isolate server-side state for you.

## 2. Synchronize on conditions, not elapsed time

Playwright already auto-waits for actionability before actions such as `click()`. For example, it checks that the target resolves appropriately and is visible, stable, able to receive events, and enabled where relevant.

That is very different from sleeping for an arbitrary duration.

```ts
// ❌ This proves only that five seconds elapsed.
await page.waitForTimeout(5000);
await page.getByRole('button', { name: 'Continue' }).click();
```

```ts
// ✅ The action waits for actionability; the assertion proves the resulting state.
await page.getByRole('button', { name: 'Continue' }).click();
await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
```

### Is `waitForTimeout()` ever acceptable?

**Context dependent:** a deliberate timeout can be useful while debugging or demonstrating behavior. It is almost never the right synchronization primitive in a production test.

If removing a timeout makes a test fail, identify what the timeout was accidentally waiting for: a response, navigation, animation, database update, websocket event, background job, or rendered UI state.

## 3. Prefer web-first assertions

Playwright's async matchers retry until their condition is satisfied or the assertion timeout expires.

```ts
// ❌ Snapshot-in-time check. The UI may simply not be ready yet.
expect(await page.getByText('Saved').isVisible()).toBe(true);
```

```ts
// ✅ Retrying assertion.
await expect(page.getByText('Saved')).toBeVisible();
```

The difference is fundamental: the second version expresses an eventual user-visible condition and lets Playwright synchronize around it.

Use assertions to prove outcomes, not merely to confirm that an action did not throw.

## 4. Make completion observable

A click is not an outcome.

```ts
await page.getByRole('button', { name: 'Save' }).click();
```

What proves saving completed? Depending on the application, it might be:

- a success message,
- a URL change,
- a dialog closing,
- a row appearing,
- a button becoming disabled,
- a response completing,
- or persisted state visible after reload.

Prefer the signal closest to what the user or requirement actually cares about.

```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('status')).toHaveText('Changes saved');
```

**Engineering recommendation:** if an operation has no observable completion signal, consider whether the product itself needs a clearer state transition. Testability often exposes UX and system-design ambiguity.

## 5. Determinism means controlling relevant inputs

A test can become nondeterministic when it relies on uncontrolled:

- current time or timezone,
- randomly generated data with no recorded seed,
- shared accounts,
- third-party services,
- eventually consistent backends,
- asynchronous jobs,
- network responses,
- feature flags,
- locale,
- or test execution order.

Do not mock everything merely to make tests green. Control dependencies according to the purpose of the test.

If the test is meant to prove your UI handles a declined payment correctly, controlling the payment response may be appropriate. If the test is meant to prove the real payment integration works, mocking that integration defeats the test.

## 6. Retries are a diagnostic signal, not a cure

Playwright supports test retries and classifies outcomes so teams can distinguish tests that passed immediately from tests that passed only after retrying.

That makes retries useful in CI, but a flaky pass is still evidence of instability.

```ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

**Engineering recommendation:** track flaky tests as defects. Do not allow retry success to erase the fact that the original attempt failed.

A retry can help with transient infrastructure noise. It cannot repair a race condition, shared-data collision, weak locator, or missing completion condition.

## 7. Avoid common reliability traps

| Trap | Why it flakes | Prefer |
| --- | --- | --- |
| Fixed sleeps | Assumes timing | Observable state or event |
| Test A prepares Test B | Creates order dependence | Independent setup |
| Shared mutable account | Parallel tests collide | Per-worker/test data strategy |
| Immediate boolean visibility check | Samples too early | Web-first assertion |
| Weak DOM selector | Couples to implementation | User-facing locator |
| Retry until green | Hides instability | Root-cause + retain retry signal |
| UI setup for every prerequisite | Slow, failure-prone setup | API/fixture setup when appropriate |
| Assertion-free action sequence | Doesn't prove outcome | Assert meaningful postcondition |

## 8. A reliable test tells a small, complete story

A maintainable E2E test usually has a recognizable shape:

```ts
test('customer can update their shipping address', async ({ page, request }) => {
  // Arrange: establish owned state.
  const customer = await createCustomer(request);

  // Act: perform the behavior under test.
  await page.goto(`/customers/${customer.id}/address`);
  await page.getByLabel('Street address').fill('100 Playwright Way');
  await page.getByRole('button', { name: 'Save address' }).click();

  // Assert: prove the meaningful outcome.
  await expect(page.getByRole('status')).toHaveText('Address updated');
  await expect(page.getByLabel('Street address')).toHaveValue('100 Playwright Way');
});
```

This is not a demand that every test contain exactly one action or assertion. It is a design heuristic: setup should establish the scenario, actions should exercise the behavior, and assertions should prove the result.

## Review checklist

Before accepting a test, ask:

- Can it run alone?
- Can it run in parallel?
- Does it own or deliberately isolate mutable data?
- Does every wait correspond to a real condition?
- Do assertions use Playwright's retrying matchers where appropriate?
- Does the test prove an outcome rather than merely perform actions?
- Would a retry reveal a defect rather than hide one?
- If it fails in CI, will the failure leave enough evidence to diagnose?

## Related field guides

- [Why is my Playwright test flaky?](flakiness-diagnostic.md)
- Locator Strategy *(v0.1 PR 3)*
- Fixtures, Authentication & Test Data *(v0.1 PR 4)*
- CI & Debugging *(v0.1 PR 6)*

## Official references

- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright: Auto-waiting / actionability](https://playwright.dev/docs/actionability)
- [Playwright: Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright: Isolation](https://playwright.dev/docs/browser-contexts)
- [Playwright: Retries](https://playwright.dev/docs/test-retries)

---

**Verification note:** Playwright-specific claims and linked official guidance were reviewed against the documentation above on 2026-08-26. Examples are intentionally small and illustrative; executable-example validation is planned for v0.1 PR 9.