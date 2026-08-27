# Playwright Anti-Pattern Catalog

> An anti-pattern is not “code I dislike.” It is a recurring solution that creates predictable reliability, clarity, or maintenance problems in the context where it is used.

**Last verified:** 2026-08-26

Each entry follows the same shape: **symptom → why it hurts → better direction → legitimate exception**.

## 1. Arbitrary sleeps

```ts
await page.waitForTimeout(5000);
```

**Why it hurts:** the test waits too long when the application is fast and still fails when the application takes longer than the guess.

**Better:** wait for an observable state, event, response, or web-first assertion.

**Exception:** elapsed time itself is part of the scenario or a deliberate debugging experiment.

## 2. Snapshot-style assertions on dynamic UI

```ts
expect(await page.getByText('Saved').isVisible()).toBe(true);
```

**Why it hurts:** it samples state once rather than benefiting from Playwright's retrying assertions.

**Better:**

```ts
await expect(page.getByText('Saved')).toBeVisible();
```

**Exception:** you intentionally need an immediate non-retrying observation and understand that semantic difference.

## 3. DOM archaeology selectors

```ts
page.locator('#app > div:nth-child(2) > div > button.primary')
```

**Why it hurts:** routine markup or styling refactors break the test without changing user behavior.

**Better:** semantic/user-facing locators or a stable explicit test contract.

**Exception:** DOM structure itself is under test or a third-party/custom surface exposes no better contract.

## 4. `.first()` as ambiguity suppression

```ts
await page.getByRole('button', { name: 'Delete' }).first().click();
```

**Why it hurts:** it converts “I do not know which Delete button” into “pick whichever happens to come first.”

**Better:** scope to the invoice, row, card, dialog, or other domain context.

**Exception:** first position is genuinely part of the requirement.

## 5. `force: true` as the default click fix

```ts
await button.click({ force: true });
```

**Why it hurts:** it can bypass useful actionability evidence such as overlays, disabled state, or incorrect targeting.

**Better:** determine why normal interaction is not possible.

**Exception:** the scenario intentionally requires bypassing actionability and the test documents why.

## 6. Universal `networkidle`

```ts
await page.waitForLoadState('networkidle');
```

used as a blanket “the page is ready” rule.

**Why it hurts:** modern apps may poll, stream, load analytics, or maintain sockets; network quietness may also occur before the user-relevant state is ready.

**Better:** wait for the state the next action actually requires.

**Exception:** network quietness is specifically meaningful for the application and scenario.

## 7. UI setup for every prerequisite

A test spends 90 seconds creating users, organizations, and records through UI before reaching the behavior it actually tests.

**Why it hurts:** slow, broad tests accumulate unrelated failure points.

**Better:** create prerequisite state through APIs/fixtures when those UI flows are not part of the claim.

**Exception:** the prerequisite journey itself is the behavior under test.

## 8. Shared mutable account across parallel tests

**Why it hurts:** browser isolation does not isolate backend carts, preferences, quotas, records, or permissions. Tests collide nondeterministically.

**Better:** immutable shared state or isolated accounts/data per worker/test according to the application model.

**Exception:** tests are proven read-only against that account's relevant server-side state.

## 9. Retry until green

```ts
retries: 5
```

with no investigation of first-attempt failures.

**Why it hurts:** retries can launder a reliability defect into a successful pipeline and increase cost.

**Better:** retain flaky classification and diagnose what changes between attempts.

**Exception:** transient external failure is an explicitly accepted risk and retry policy is part of the system's test strategy—not a substitute for visibility.

## 10. Giant `BasePage`

A base class owns clicks, fills, waits, API calls, auth, screenshots, parsing, navigation, and miscellaneous utilities.

**Why it hurts:** unrelated pages become coupled through inheritance and contributors must understand a framework layered over Playwright itself.

**Better:** composition, focused helpers, fixtures, components, and domain-level behavior.

**Exception:** small, genuinely stable shared behavior can justify a base abstraction, but keep the contract narrow.

## 11. Wrapping Playwright to rename Playwright

```ts
async click(locator: Locator) {
  await locator.click();
}
```

**Why it hurts:** indirection without meaning.

**Better:** abstract application capabilities such as `approveApplication()` or `inviteMember()` when those concepts repeat.

**Exception:** a wrapper enforces a real cross-cutting policy that cannot be handled more cleanly elsewhere.

## 12. One Page Object per URL by policy

**Why it hurts:** architecture is created before responsibility exists; tiny pages receive ceremony while large component boundaries remain hidden.

**Better:** choose helpers, components, Page Objects, or workflows based on repeated behavior and ownership.

**Exception:** a page genuinely has substantial reusable behavior deserving an object.

## 13. One method per element

```ts
fillUsername()
fillPassword()
clickLoginButton()
```

**Why it hurts:** the abstraction often reproduces the test line-for-line while increasing navigation distance.

**Better:** direct Playwright or a meaningful operation such as `signIn(user)` when reuse justifies it.

## 14. Boolean Page Object assertions

```ts
expect(await orders.isOrderVisible(id)).toBe(true);
```

**Why it hurts:** often discards Playwright's web-first retry semantics.

**Better:** expose the locator or provide a semantic assertion using `expect(locator)`.

## 15. Tests depending on execution order

**Why it hurts:** selective runs, retries, sharding, and parallelism become unsafe; one failure can cascade.

**Better:** each test owns or establishes the state it requires.

**Exception:** a deliberately serial workflow is truly indivisible and explicitly modeled as such.

## 16. Global cleanup that deletes “all test data”

**Why it hurts:** one worker/job can delete records still being used by another.

**Better:** namespace data and clean only resources owned by the test/worker/run.

**Exception:** the environment is exclusively leased to one run and that ownership is enforced.

## 17. Hard-coded unique data

```ts
const email = 'playwright-test@example.com';
```

across parallel or repeated runs.

**Why it hurts:** uniqueness constraints and stale data create collisions.

**Better:** generate deterministic run/worker/test-scoped identities where uniqueness is required.

**Exception:** the record is intentionally immutable shared reference data.

## 18. Mock everything

**Why it hurts:** the suite can become extremely deterministic while proving very little about real contracts and integration behavior.

**Better:** mock selectively for client states and retain appropriate real-integration coverage.

**Exception:** a component-level browser test intentionally has a narrow mocked boundary and is labeled accordingly.

## 19. Mock nothing

**Why it hurts:** every client-side error-state test may depend on expensive, rare, destructive, or uncontrollable external behavior.

**Better:** use mocks when isolation is the honest scope, and real dependencies when integration is the claim.

## 20. Waiting for an event after triggering it

```ts
await page.getByRole('link', { name: 'Download' }).click();
const download = await page.waitForEvent('download');
```

**Why it hurts:** a fast event can occur before the listener exists.

**Better:**

```ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('link', { name: 'Download' }).click();
const download = await downloadPromise;
```

## 21. CI artifacts only on success

**Why it hurts:** the run discards the evidence precisely when it is needed most.

**Better:** preserve reports/traces/results after failure, subject to security and retention policy.

## 22. Dumping environment variables into logs

**Why it hurts:** diagnostics can leak credentials, tokens, URLs, or sensitive configuration.

**Better:** record a safe allowlist of non-secret environment identity.

## 23. Treating every CI-only failure as “CI is slow”

**Why it hurts:** hides shared-state collisions, resource saturation, environment drift, backend failures, and real product races.

**Better:** inspect the trace and identify the first divergence before changing timing.

## 24. Increasing workers without counting total concurrency

Four shards × four workers is not “four-way parallel.” It may be sixteen workers hitting the same environment.

**Why it hurts:** backend and test-data capacity can become the hidden bottleneck.

**Better:** reason about total concurrent pressure across jobs, workers, accounts, and services.

## 25. Updating visual snapshots because CI disagrees

**Why it hurts:** may bless a real regression or an uncontrolled rendering difference.

**Better:** understand browser/OS/fonts/viewport/dynamic content and maintain baselines in a controlled environment.

## 26. Treating a mocked response as integration proof

**Why it hurts:** the test verifies the browser against your simulated contract, not the live dependency.

**Better:** state the scope honestly and cover the real contract elsewhere when required.

## 27. Hiding every assertion inside helpers

**Why it hurts:** the test no longer communicates what outcome defines success.

**Better:** keep scenario-defining assertions visible; hide only stable intrinsic invariants when useful.

## 28. DRY at any cost

**Why it hurts:** small readable duplication can be replaced by a generic abstraction that is harder to name, change, and debug.

**Better:** abstract repeated concepts that change for the same reason, not merely repeated syntax.

## 29. A fixture as a service locator for everything

A single fixture injects pages, API clients, factories, utilities, users, feature flags, and unrelated domain objects into every test.

**Why it hurts:** dependencies become broad and ownership becomes unclear.

**Better:** focused fixtures representing capabilities or owned resources.

## 30. Optimizing for green instead of trustworthy

This is the meta anti-pattern behind many others.

A green build can be produced by sleeps, force clicks, retries, serial execution, broad mocks, and weak assertions. None guarantees that the suite is trustworthy.

The Field Guide's standard is stricter:

> A failure should be meaningful, explainable, and repeatable—and a pass should prove the behavior the test claims to cover.

## Cross-reference map

| Anti-pattern family | Deep guide |
| --- | --- |
| Sleeps, races, weak assertions | [Reliable Test Design](../docs/reliable-test-design/README.md) |
| Brittle/ambiguous selectors | [Locator Strategy](../docs/locators/README.md) |
| Shared auth/data collisions | [Fixtures, Authentication & Test Data](../docs/fixtures-auth-test-data/README.md) |
| Framework/page-object excess | [Playwright Test Architecture](../docs/architecture/README.md) |
| Retry/artifact/concurrency problems | [CI & Debugging](../docs/ci-debugging/README.md) |
| Mocking/API/browser boundary mistakes | [API + Advanced Playwright](../docs/api-advanced/README.md) |
