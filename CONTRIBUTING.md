# Contributing to the Playwright Field Guide

Thanks for helping make the Field Guide more useful, accurate, and current.

## What makes a strong contribution

High-value contributions usually do one or more of the following:

- explain a Playwright behavior more clearly;
- add a reproducible failure mode or anti-pattern;
- improve a code example without hiding important setup;
- document a tradeoff that is commonly oversimplified;
- update guidance that changed in a newer Playwright release;
- add a focused recipe for a real testing task;
- improve diagnosis of flaky or CI-only failures.

A large amount of content is not automatically a better contribution. Prefer one excellent, reviewable idea over a broad collection of shallow tips.

## Before opening a pull request

1. Check current Playwright documentation for version-sensitive claims.
2. Decide whether the advice is **Official Playwright guidance**, an **Engineering recommendation**, or **Context dependent**.
3. Link authoritative upstream documentation when presenting official guidance.
4. Include the reason behind the recommendation, not just the preferred syntax.
5. Add or update a **Last verified** marker when the material is version sensitive.
6. Keep examples focused on the concept being taught.

Read [docs/editorial-standard.md](docs/editorial-standard.md) before adding a substantial guide.

## Examples

TypeScript is the default language for examples unless the topic specifically requires another language.

Good examples should:

- be small enough to understand without reconstructing an entire application;
- use meaningful accessible names and realistic test intent;
- avoid unnecessary framework layers;
- show material setup when it affects the lesson;
- distinguish fragile patterns from context-dependent alternatives.

When executable examples are introduced, contributed executable examples must pass repository CI.

## Official guidance vs project opinion

Do not write “Playwright recommends…” unless the linked current Playwright documentation supports the statement.

Project-level advice is welcome. Label it honestly as an engineering recommendation and explain its tradeoffs.

## Pull request scope

Keep pull requests cohesive. A documentation correction, a new recipe, and a broad architecture rewrite should normally be separate changes.

If a contribution changes the Field Guide's editorial philosophy or repository-wide architecture, explain the motivation explicitly in the PR description.

## Generated or AI-assisted content

AI-assisted contributions are permitted, but the contributor is responsible for every claim, example, link, and recommendation. Generated text is not evidence. Verify Playwright-specific behavior against authoritative sources and test code when practical.

## Conduct and security

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Do not file public issues for security vulnerabilities. Follow [SECURITY.md](SECURITY.md) instead.
