# Playwright Field Guide — v0.1 Roadmap

The first release is deliberately built as a sequence of focused milestones. Depth and trustworthiness matter more than the number of pages.

## PR 1 — Foundation & Identity

- README and project identity
- information architecture
- editorial/advice classification standard
- contribution and security policies
- compatibility/freshness policy
- initial content-quality CI

## PR 2 — Reliable Test Design

- test isolation
- deterministic tests
- synchronization and waiting
- web-first assertions
- retry misuse
- `waitForTimeout()` and related anti-patterns
- “Why is my test flaky?” diagnostic guide

## PR 3 — Locator Strategy

- locator decision tree
- roles, labels, text, test IDs
- CSS/XPath tradeoffs
- chaining and filtering
- dynamic UI patterns
- fragile-vs-resilient examples

## PR 4 — Fixtures, Authentication & Test Data

- fixtures vs hooks
- worker-scoped fixtures
- authentication-state strategies
- parallel-user isolation
- API/data setup vs UI setup
- test-data factories

## PR 5 — Architecture

- Page Objects: when they help and when they hurt
- component objects
- workflow/domain layers
- suite organization
- small, medium, and large suite examples
- abstraction warning signs

## PR 6 — CI & Debugging

- GitHub Actions
- Trace Viewer
- screenshots and video
- retries
- sharding and parallelism
- artifact retention
- “passes locally, fails in CI” workflow

## PR 7 — API + Advanced Playwright

- API testing
- API/UI hybrid workflows
- network interception
- mocking
- downloads/uploads
- popups, iframes, and multiple pages

## PR 8 — FAQ & Field Recipes

- searchable FAQ
- copyable recipes
- anti-pattern catalog
- troubleshooting index

## PR 9 — Living Documentation

- executable examples
- scheduled Playwright-version CI
- dependency automation
- freshness checks
- documentation validation
- release-note review process

## PR 10 — v0.1 Readiness

- navigation/content audit
- beginner-to-advanced learning path
- repository presentation and discoverability
- badges/topics polish
- first tagged release

## Scope rule

> The Field Guide teaches Playwright engineering. It does not become another Playwright framework.

Examples exist to prove and clarify guidance. Framework abstraction should only be introduced when the lesson itself requires it.
