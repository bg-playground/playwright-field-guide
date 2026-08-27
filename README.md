# 🎭 Playwright Field Guide

> Production-minded Playwright testing patterns for QA engineers, SDETs, developers, and teams that want fast tests **without flaky tests**.

[![Status](https://img.shields.io/badge/status-building%20v0.1-orange)](#project-status)
[![Playwright](https://img.shields.io/badge/Playwright-living%20guide-2EAD33?logo=playwright)](https://playwright.dev/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Best practices · How-tos · Recipes · Anti-patterns · Debugging · Architecture · FAQ

This repository is a living engineering field guide for building reliable browser automation with Playwright. It is intentionally **not another starter framework**. The goal is to explain the decisions that make a Playwright suite resilient, diagnosable, maintainable, and useful in real delivery pipelines.

---

## Start here

| I want to… | Go to… |
| --- | --- |
| Stop flaky tests | [**Reliable Test Design**](docs/reliable-test-design/README.md) |
| Diagnose a flaky test | [**Why Is My Playwright Test Flaky?**](docs/reliable-test-design/flakiness-diagnostic.md) |
| Choose resilient locators | [**Locator Strategy**](docs/locators/README.md) |
| See locator choices by example | [**Locator Decision Examples**](docs/locators/decision-examples.md) |
| Reuse authentication safely | [**Fixtures, Authentication & Test Data**](docs/fixtures-auth-test-data/README.md) |
| Choose an authentication model | [**Authentication Decision Guide**](docs/fixtures-auth-test-data/authentication-decision-guide.md) |
| Design parallel-safe test data | [**Test Data Patterns**](docs/fixtures-auth-test-data/test-data-patterns.md) |
| Structure a real test suite | **Architecture** *(v0.1 PR 5)* |
| Debug “passes locally, fails in CI” | **CI & Debugging** *(v0.1 PR 6)* |
| Test APIs and UI together | **API + Advanced Playwright** *(v0.1 PR 7)* |
| Find a copyable solution | **Field Recipes** *(v0.1 PR 8)* |
| Get a straight answer to a common question | **FAQ** *(v0.1 PR 8)* |
| Understand what *not* to do | **Anti-pattern Catalog** *(v0.1 PR 8)* |

The remaining placeholders become live as each v0.1 milestone lands. See the [v0.1 roadmap](docs/roadmap.md).

## What this guide optimizes for

A strong Playwright suite should be:

- **Reliable** — failures should mean something.
- **Readable** — tests should communicate user behavior and intent.
- **Isolated** — one test should not quietly depend on another.
- **Diagnosable** — CI failures should leave enough evidence to explain what happened.
- **Maintainable** — selectors, helpers, fixtures, and abstractions should survive routine product change.
- **Fast enough to run often** — feedback loses value when the suite is avoided.
- **Honest about tradeoffs** — not every useful pattern is a universal rule.

These principles track Playwright's official guidance around isolated tests, user-visible behavior, resilient locators, web-first assertions, and trace-based CI debugging.

## The Field Guide standard

Every substantial guide should make it clear what kind of advice you are reading.

> **📘 Official Playwright guidance**  
> A recommendation directly supported by Playwright documentation.
>
> **🧭 Engineering recommendation**  
> A maintainability, reliability, or architecture recommendation from this project.
>
> **⚖️ Context dependent**  
> A legitimate choice whose best answer depends on your application, team, risk, or test portfolio.

Where practical, major guides follow the same pattern:

1. **Recommendation**
2. **Why it matters**
3. **Good example**
4. **Anti-pattern**
5. **Exceptions and tradeoffs**
6. **Official Playwright references**
7. **Last verified**

See the full [editorial standard](docs/editorial-standard.md).

## A tiny example of the philosophy

Avoid assertions that take a one-time snapshot of a changing UI state:

```ts
// ❌ Fragile: checks once and does not benefit from Playwright's web-first retry behavior.
expect(await page.getByText('Welcome').isVisible()).toBe(true);
```

Prefer a web-first assertion:

```ts
// ✅ Better: Playwright retries until the expectation succeeds or times out.
await expect(page.getByText('Welcome')).toBeVisible();
```

The Field Guide will explain not just **what** to type, but **why the second pattern is more reliable**.

## Planned knowledge map

```text
docs/
├── getting-started/
├── best-practices/
├── architecture/
├── locators/
├── assertions/
├── fixtures/
├── page-objects/
├── authentication/
├── test-data/
├── api-testing/
├── network/
├── accessibility/
├── visual-testing/
├── debugging/
├── parallelism/
├── ci/
├── performance/
└── migration/

recipes/
├── authentication/
├── downloads/
├── uploads/
├── iframes/
├── popups/
├── api-plus-ui/
├── mocking/
├── waiting/
├── test-data/
└── github-actions/

examples/
├── basic/
├── fixtures/
├── page-objects/
├── api-testing/
└── production-structure/

faq/
anti-patterns/
```

Directories are added when they contain useful material; the project will not create empty taxonomy for its own sake.

## What this repository is — and is not

### It is

- a practical reference for everyday Playwright engineering decisions;
- a set of focused, copyable recipes;
- a catalog of failure modes and anti-patterns;
- an architecture guide for suites that have grown beyond a few tests;
- a continuously reviewed knowledge base that evolves with Playwright.

### It is not

- a replacement for the official Playwright documentation;
- a universal enterprise framework;
- a collection of unexplained snippets;
- a place where preference is presented as fact;
- a reason to add abstractions that a test suite does not need.

## Relationship to `bgstm-playwright-frameworks`

[`bgstm-playwright-frameworks`](https://github.com/bg-playground/bgstm-playwright-frameworks) is a separate project: an opinionated Playwright framework/monorepo with BGSTM integration and domain-specific execution scaffolding.

The Field Guide may harvest **generalizable lessons and patterns** from real framework work, but it does not inherit that repository's product architecture. Think **harvest, don't inherit**.

## Keeping the guide current

Playwright changes frequently. The project will evolve toward executable documentation and automated freshness checks so examples do not silently rot.

Current policy:

- guidance should link to authoritative Playwright documentation when claiming an official recommendation;
- major guides include a **Last verified** marker;
- version-sensitive material must identify the assumption it depends on;
- scheduled CI and dependency automation are planned for the v0.1 living-documentation milestone;
- release-note reviews should summarize **what testing engineers need to care about**, rather than copying upstream changelogs.

See [compatibility and freshness](docs/compatibility.md).

## Project status

**v0.1 is under active construction.** The initial release is intentionally being built as a sequence of focused milestones rather than a large dump of shallow tips.

The goal for v0.1 is a small set of resources good enough to bookmark: reliability, locators, fixtures/auth/test data, architecture, CI/debugging, advanced Playwright, FAQ/recipes, and automated freshness checks.

See [the roadmap](docs/roadmap.md).

## Contributing

Contributions are welcome, especially when they add a reproducible failure mode, a clearer example, an important tradeoff, or evidence that guidance has changed in a newer Playwright release.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Apache-2.0. See [LICENSE](LICENSE).

---

### One rule worth remembering

> **A test suite is not reliable because it passes. It is reliable when a failure is trustworthy, explainable, and repeatable.**
