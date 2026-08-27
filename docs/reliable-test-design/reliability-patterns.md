# Reliability Patterns and Anti-Patterns

> Fast reference: recognize the smell, understand the failure mode, replace it with a meaningful condition.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26

## Pattern 1: Wait for the outcome, not the clock

### Anti-pattern

```ts
await page.getByRole('button', { name: 'Submit' }).click();
await page.waitForTimeout(2000);
```

### Better

```ts
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByRole('status')).toHaveText('Submitted');
```

**Why:** elapsed time does not prove application state. A meaningful postcondition does.

## Pattern 2: Use retrying assertions for changing UI

### Anti-pattern

```ts
const visible = await page.getByText('Ready').isVisible();
expect(visible).toBe(true);
```

### Better

```ts
await expect(page.getByText('Ready')).toBeVisible();
```

**Why:** Playwright's web-first assertions retry until the condition succeeds or times out.

## Pattern 3: Establish state without testing irrelevant setup

### Anti-pattern

A refund test spends 40 UI steps creating a customer, product, order, payment, and shipment before it reaches refund behavior.

### Better

Create prerequisites through a supported API or fixture when those setup flows are not part of what the test intends to prove, then exercise the refund through the UI.

**Tradeoff:** if the objective is an end-to-end proof of the entire purchase-to-refund journey, bypassing setup through APIs changes the scope of the test. Name and classify the test accordingly.

## Pattern 4: Make parallelism safe by design

### Anti-pattern

```ts
const USER_EMAIL = 'automation@example.com';
```

Every state-changing test uses the same account and modifies its preferences, cart, messages, or records.

### Better

Allocate mutable state per test or worker when tests can execute concurrently.

```ts
test('updates profile', async ({ workerUser, page }) => {
  await loginAs(page, workerUser);
  // ...
});
```

The implementation can vary. The principle is that concurrent tests should not unknowingly compete for the same mutable resource.

## Pattern 5: Assert after consequential actions

### Anti-pattern

```ts
await page.getByRole('button', { name: 'Delete account' }).click();
await page.getByRole('button', { name: 'Confirm' }).click();
```

The test ends without proving deletion occurred.

### Better

```ts
await page.getByRole('button', { name: 'Delete account' }).click();
await page.getByRole('button', { name: 'Confirm' }).click();
await expect(page.getByRole('heading', { name: 'Account deleted' })).toBeVisible();
```

For critical persistence behavior, a stronger assertion may verify the state after navigation or reload rather than trusting a transient toast.

## Pattern 6: Do not turn retries into acceptance criteria

### Anti-pattern

> It passes eventually, so the test is fine.

### Better

Use retry metadata to identify instability. Preserve artifacts from the failed attempt and investigate recurring flaky tests.

Retries answer:

> Can this test succeed on another attempt?

They do not answer:

> Was the first failure acceptable?

## Pattern 7: Keep assertions aligned with user intent

### Weak

```ts
await expect(page.locator('.modal-container')).toHaveClass(/open/);
```

### Stronger when the requirement is user-visible dialog behavior

```ts
await expect(page.getByRole('dialog', { name: 'Payment details' })).toBeVisible();
```

The second assertion describes behavior in terms closer to what the user experiences and is generally less coupled to styling implementation.

## Pattern 8: Diagnose actionability failures before bypassing them

### Anti-pattern

```ts
await page.getByRole('button', { name: 'Pay' }).click({ force: true });
```

added only because the normal click sometimes fails.

### Better

Determine why the button is not actionable. Is it covered by a spinner? Still disabled? Animating? Duplicated? Offscreen because the wrong element matched?

Actionability failure is evidence. Do not discard it before understanding it.

## Pattern 9: Record nondeterminism when you intentionally use it

Random data can improve coverage, but unrecorded randomness can make failures hard to reproduce.

If a test generates randomized inputs, log or attach enough information to reproduce the failing case. For property-based or seeded generation, retain the seed.

## Pattern 10: Treat cleanup as part of concurrency design

Cleanup can itself create flakes.

A global cleanup job that deletes all records named `test-*` can remove data another worker is actively using.

Prefer uniquely owned resources and cleanup scoped to that ownership. Where possible, make cleanup idempotent so a partially failed test does not create a second failure during teardown.

## Reliability review questions

When reviewing a test, look for these smells:

- arbitrary sleeps,
- immediate state sampling,
- shared mutable identities,
- fixed record names,
- tests that require suite order,
- forced actions with no explanation,
- retries added without diagnosis,
- UI-heavy prerequisite setup,
- no meaningful postcondition,
- unrecorded random input,
- destructive global cleanup,
- and assertions tightly coupled to CSS implementation.

Not every occurrence is automatically wrong. Every occurrence deserves an explanation.

## Official references

- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright: Auto-waiting](https://playwright.dev/docs/actionability)
- [Playwright: Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright: Retries](https://playwright.dev/docs/test-retries)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26.
