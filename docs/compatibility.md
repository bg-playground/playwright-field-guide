# Compatibility and Freshness

The Playwright Field Guide is intended to stay useful as Playwright evolves. That requires both automated execution and intentional editorial review.

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

Do not mechanically update a verification date. The date means the affected guidance was actually reviewed.

## Executable documentation

The repository contains a deliberately small executable suite under `examples/executable/`.

Its purpose is not to convert every Markdown snippet into a test. It validates representative core patterns using the repository's explicitly pinned Playwright dependency.

CI installs dependencies from the committed lockfile and runs the executable suite with:

```bash
npm ci --no-audit --no-fund
npx playwright install --with-deps chromium
npm run test:docs
```

Executable coverage should grow when a code example is important, version-sensitive, and practical to validate without creating a large demonstration application.

## Runtime policy

Executable examples currently use:

- Node.js 22 in GitHub Actions;
- the Playwright version pinned in `package.json` and `package-lock.json`;
- Chromium for the core documentation-validation suite.

Additional browsers should be added when the behavior being documented is meaningfully browser-specific. Running three browsers merely to multiply green checks is not the goal.

Avoid documenting a runtime/version range that CI does not actually exercise.

## Dependency automation

Dependabot checks npm and GitHub Actions dependencies weekly.

A Playwright update PR is a **review trigger**, not permission to automatically reinterpret guidance.

For a Playwright update:

1. run the executable suite;
2. review upstream release notes;
3. identify affected Field Guide claims/examples;
4. update guidance only when needed;
5. update `Last verified` only for material actually reviewed.

See [Playwright Release Review](maintenance/release-review.md).

## Scheduled freshness validation

The `Freshness validation` workflow runs weekly and can also be started manually.

It verifies that the pinned executable documentation still runs in a clean CI environment and reminds maintainers to review outstanding Playwright updates/release notes.

This complements pull-request CI. It does not claim to prove that all prose is current.

## Link and prose freshness

Automation can detect some forms of staleness:

- executable code no longer compiling/running;
- dependency updates;
- broken links, when link validation is enabled;
- workflow/runtime failures.

Automation cannot reliably decide whether an engineering recommendation still reflects current upstream best practice. That remains an editorial responsibility.

## Release-note interpretation

Release reviews should answer:

1. What changed?
2. Does it affect test authors, framework maintainers, or CI owners?
3. Does existing Field Guide advice need to change?
4. Is there a new pattern worth demonstrating?

They should not duplicate the upstream Playwright changelog.

## Freshness model

```text
Playwright release / dependency update
            ↓
     automated signal
            ↓
 executable examples + CI
            ↓
 human release-note review
            ↓
 affected guidance identified
            ↓
 update only what changed
            ↓
 verification markers updated intentionally
```

The goal is not zero maintenance. The goal is **visible, repeatable maintenance**.

## Maintenance resources

- [Playwright Release Review](maintenance/release-review.md)
- [Editorial Standard](editorial-standard.md)
- [v0.1 Roadmap](roadmap.md)

---

**Foundation verified:** 2026-08-26 against current Playwright documentation for best practices, locators, assertions, CI, tracing, and maintenance-relevant runtime guidance.
