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

- [x] representative executable examples
- [x] pull-request and `main` executable-documentation CI
- [x] weekly scheduled freshness validation
- [x] npm and GitHub Actions dependency automation
- [x] explicit pinned Playwright validation version
- [x] compatibility/freshness maintenance policy
- [x] repeatable Playwright release-review process

The maintenance model deliberately separates automated detection/execution from editorial judgment. A dependency update can trigger review; it cannot declare prose current.

## PR 10 — v0.1 Readiness

- navigation/content audit
- beginner-to-advanced learning path
- repository presentation and discoverability
- badges/topics polish
- CI/freshness validation audit
- first tagged release

## Scope rule

> The Field Guide teaches Playwright engineering. It does not become another Playwright framework.

Examples exist to prove and clarify guidance. Framework abstraction should only be introduced when the lesson itself requires it.
