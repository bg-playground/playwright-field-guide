# Playwright FAQ

> Short answers first. Follow the links when the real answer needs context.

**Last verified:** 2026-08-26

## Should I use `waitForTimeout()` to fix flaky tests?

Usually no. A fixed delay waits for time, not for the state the test needs.

```ts
// Fragile
await page.waitForTimeout(3000);

// Prefer an observable condition
await expect(page.getByRole('status')).toHaveText('Report ready');
```

Use a deliberate delay only when elapsed time itself is part of what you are testing or diagnosing.

See [Reliable Test Design](../docs/reliable-test-design/README.md).

## Should I use `getByRole()` for everything?

No. It is an excellent default when accessible role and name represent the target, but locator choice should match the contract under test. Labels, text, test IDs, and occasionally CSS/XPath can be the better choice.

See [Locator Strategy](../docs/locators/README.md).

## Are test IDs bad practice?

No. A stable test ID can be a strong explicit automation contract, especially when visible copy is localized or intentionally volatile, or when domain identity is otherwise ambiguous.

Do not use test IDs merely to encode DOM position.

## Should every page have a Page Object?

No. Page Objects are optional architecture. Start directly, then extract repeated concepts when the abstraction improves clarity or maintenance.

See [Page Objects: Decision Guide](../docs/architecture/page-objects.md).

## Should Page Objects contain assertions?

They can. A useful default is to keep scenario-defining outcomes visible in the test while allowing page/component objects to assert stable invariants intrinsic to their operations.

Avoid boolean wrappers that throw away Playwright's retrying assertions.

## Should I log in through the UI before every test?

Usually not when authentication itself is not under test. Playwright storage state or API-assisted authentication can make unrelated tests faster and more focused.

The correct strategy depends on whether tests mutate shared server-side state and whether accounts can safely be reused.

See [Authentication Decision Guide](../docs/fixtures-auth-test-data/authentication-decision-guide.md).

## Can all tests share one authenticated account?

Only when they can safely coexist. Browser contexts isolate browser state; they do not isolate backend records, quotas, preferences, carts, permissions, or other server-side state.

For state-mutating parallel tests, per-worker or otherwise isolated accounts are often safer.

## Hooks or fixtures?

Use hooks for lifecycle behavior naturally owned by a suite/file. Use fixtures when a reusable dependency, capability, or owned resource should be injected with explicit setup/teardown semantics.

Do not convert every `beforeEach` into a fixture just because fixtures are powerful.

## Should I create test data through the UI?

Only when the UI creation flow is part of what the test needs to prove. Otherwise API or controlled backend setup is often faster and more deterministic.

A browser test for editing an order does not need to prove order creation every time.

## Is API setup still an end-to-end test?

That label is less useful than stating what the test proves. An API-assisted browser test can still exercise the complete browser behavior under test while deliberately skipping prerequisite UI.

Be explicit about the boundary instead of relying on a vague category name.

See [API vs UI: Decision Guide](../docs/api-advanced/api-vs-ui.md).

## Should I mock network calls?

Mock when you intentionally want deterministic client-side behavior, rare/error states, or isolation from a dependency. Do not claim that a mocked test proves the real integration.

Keep at least enough real-integration coverage to validate the contract you actually depend on.

## Should I wait for `networkidle` before interacting?

Not as a universal readiness strategy. Modern applications may keep background requests, analytics, polling, or sockets active. Wait for the user-visible or domain state the next action requires.

## Why does a test pass locally but fail in CI?

Treat it as a comparison problem. Inspect the trace, find the first divergence, then compare state, concurrency, configuration, resources, network behavior, and environment identity.

See [Passes Locally, Fails in CI](../docs/ci-debugging/passes-locally.md).

## Should CI use retries?

Retries can be useful for diagnosis and for classifying flaky outcomes. They are not a cure. A test that passes only on retry is still providing reliability information.

See [CI & Debugging](../docs/ci-debugging/README.md).

## How many Playwright workers should CI use?

Start conservatively and increase only when the tests, data, application, and runner capacity are proven parallel-safe. Remember that shards multiplied by workers determine total concurrency against the environment.

## Should I use `.first()` or `nth()` when strictness fails?

Only when position itself is meaningful. If you use it merely to silence an ambiguous locator, you may select the wrong element after a layout or data change.

Scope to a meaningful container or strengthen the locator first.

## Should I use `force: true` when a click fails?

Not by default. Actionability failures often tell you that an overlay, disabled state, animation, or wrong target exists. Understand that condition before bypassing it.

## Should I wrap every Playwright method in my own framework?

Usually no. A wrapper that turns `locator.click()` into `click(locator)` adds indirection without domain meaning.

Abstract repeated concepts and capabilities, not Playwright syntax merely for its own sake.

See [Playwright Test Architecture](../docs/architecture/README.md).

## Should tests depend on each other?

Prefer independent tests. Order-dependent suites are harder to parallelize, retry, shard, debug, and run selectively.

If a workflow genuinely must be sequential, make that requirement explicit rather than allowing accidental dependency through shared state.

## Is a flaky test always a test-code problem?

No. Flakiness can reveal real product races, backend consistency problems, resource saturation, environment instability, accessibility/responsive defects, or shared-data collisions.

The goal is to identify which system violated the expected behavior—not merely make CI green.

## What artifacts should I keep from CI failures?

Trace is usually the highest-value browser debugging artifact. HTML reports, failure screenshots, selected video, console/network evidence, and safe application-specific identifiers can complement it.

Never attach secrets or sensitive customer data for convenience.

## When should I use multiple browser contexts?

When you need genuinely isolated browser sessions in one test, such as two users interacting with the same system. Separate pages in one context share context-level state; separate contexts do not.

## How do I test an iframe?

Prefer `frameLocator()` rooted at a stable iframe locator, then use normal semantic locators inside the frame.

See [Network & Browser Recipes](../docs/api-advanced/network-browser-recipes.md).

## What should I do when a locator suddenly becomes ambiguous on mobile?

Investigate whether desktop and mobile variants both exist in the DOM/accessibility tree. Scope to the active meaningful region rather than immediately adding `.first()`.

## How much architecture should a new suite start with?

As little as it needs. Direct tests can be excellent architecture. Add fixtures, components, Page Objects, and workflows as repeated responsibilities emerge.

See [Architecture by Suite Size](../docs/architecture/suite-size-examples.md).

## Where should I start when inheriting a flaky suite?

Start with evidence and failure categories, not a rewrite. Identify the highest-frequency failures, inspect synchronization and shared-state problems, review locator quality, and make CI artifacts trustworthy.

Then improve architecture only where it addresses demonstrated maintenance pain.

## Still unsure?

Use the question behind the question:

> What behavior am I trying to prove, and what is the narrowest reliable layer that honestly proves it?

That single question resolves a surprising number of Playwright design debates.
