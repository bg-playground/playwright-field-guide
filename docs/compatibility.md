# Compatibility and Freshness

The Playwright Field Guide is intended to stay useful as Playwright evolves. That requires an explicit freshness policy.

## Source of truth

For Playwright behavior and official recommendations, the authoritative source is the current documentation at [playwright.dev](https://playwright.dev/).

This repository adds explanation, tradeoff analysis, examples, troubleshooting, and architecture guidance. It does not replace upstream documentation.

## Verification policy

Version-sensitive guides should record a **Last verified** marker and link to the relevant Playwright documentation.

A guide should be re-reviewed when:

- a Playwright release changes an API used by the example;
- upstream best-practice guidance changes materially;
- a CI/runtime recommendation changes;
- a browser behavior assumption changes;
- a contributor reports a reproducible mismatch between the guide and a current release.

## Runtime policy

The repository will prefer actively supported Node.js releases for executable examples and CI. Exact supported versions will be declared once the first executable example suite is introduced.

Avoid documenting a version range that CI does not actually exercise.

## Living-documentation milestone

The v0.1 roadmap includes:

- executable documentation where practical;
- scheduled Playwright-version CI;
- dependency automation;
- documentation/link validation;
- a repeatable release-note review process.

The goal is simple: if a Playwright update invalidates an example, the repository should discover that through automation or an explicit review process rather than through a reader months later.

## Release-note interpretation

Future release notes in this repository should answer:

1. What changed?
2. Does it affect test authors, framework maintainers, or CI owners?
3. Does existing Field Guide advice need to change?
4. Is there a new pattern worth demonstrating?

They should not duplicate the upstream Playwright changelog.

---

**Foundation verified:** 2026-08-26 against current Playwright documentation for best practices, locators, assertions, CI, and tracing.
