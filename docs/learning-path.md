# Playwright Field Guide Learning Path

> You do not need to read the Field Guide front to back. Follow the path that matches the problem you are trying to solve.

## New to Playwright

Start with the ideas that prevent fragile habits from forming:

1. [Reliable Test Design](reliable-test-design/README.md) — isolation, synchronization, assertions, and trustworthy failures.
2. [Locator Strategy](locators/README.md) — choose locators that express user-visible meaning and survive routine UI change.
3. [Fixtures, Authentication & Test Data](fixtures-auth-test-data/README.md) — keep setup explicit, reusable, and parallel-safe.
4. [Playwright Test Architecture](architecture/README.md) — add structure only when the suite earns it.
5. [CI & Debugging](ci-debugging/README.md) — make failures diagnosable before the suite becomes large.

Then use [Field Recipes](../recipes/README.md) and the [FAQ](../faq/README.md) as task-oriented references.

## Building or refactoring an existing suite

Use this order:

1. [Why Is My Playwright Test Flaky?](reliable-test-design/flakiness-diagnostic.md)
2. [Locator Decision Examples](locators/decision-examples.md)
3. [Test Data Patterns](fixtures-auth-test-data/test-data-patterns.md)
4. [Page Objects: Decision Guide](architecture/page-objects.md)
5. [Architecture by Suite Size](architecture/suite-size-examples.md)
6. [Anti-pattern Catalog](../anti-patterns/README.md)

The goal is not to rewrite the suite into the Field Guide's preferred shape. Identify the largest sources of unreliable signal and maintenance cost, then improve those boundaries deliberately.

## Owning Playwright in CI

Start here:

1. [CI & Debugging](ci-debugging/README.md)
2. [Passes Locally, Fails in CI](ci-debugging/passes-locally.md)
3. [GitHub Actions Patterns](ci-debugging/github-actions.md)
4. [Authentication Decision Guide](fixtures-auth-test-data/authentication-decision-guide.md)
5. [Compatibility & Freshness](compatibility.md)

Pay particular attention to total concurrency, server-side test-data isolation, diagnostic artifacts, and the distinction between retries and reliability.

## Choosing API, UI, or hybrid coverage

Start with [API vs UI: Decision Guide](api-advanced/api-vs-ui.md), then continue to [API + Advanced Playwright](api-advanced/README.md).

The central question is:

> What claim does this test need to prove?

Use the cheapest layer that proves that claim without accidentally removing the behavior you intended to test.

## Looking for a quick answer

Use:

- [FAQ](../faq/README.md) for direct engineering questions;
- [Field Recipes](../recipes/README.md) for copyable task patterns;
- [Anti-pattern Catalog](../anti-patterns/README.md) when something feels fragile but you are not sure why.

Each is designed to lead into deeper material when the short answer is not enough.

## Maintaining the Field Guide

Contributors and maintainers should read:

1. [Editorial Standard](editorial-standard.md)
2. [Compatibility & Freshness](compatibility.md)
3. [Playwright Release Review](maintenance/release-review.md)
4. [Contributing](../CONTRIBUTING.md)

The repository separates automated compatibility signals from editorial judgment. Green tests prove executable compatibility for covered examples; they do not prove that every recommendation remains current.

## One suggested progression

```text
Reliable tests
     ↓
Resilient locators
     ↓
Isolated setup and data
     ↓
Right-sized architecture
     ↓
Diagnosable CI
     ↓
Intentional API/UI boundaries
     ↓
Recipes, FAQ, and anti-patterns as daily references
```

That progression is guidance, not a curriculum requirement. Experienced engineers should jump directly to the problem they need to solve.
