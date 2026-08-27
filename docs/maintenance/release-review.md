# Playwright Release Review

> Automation should tell us that Playwright changed. A human review should decide whether the Field Guide's engineering guidance needs to change.

**Last verified:** 2026-08-26

## Purpose

The Field Guide is intended to remain useful across Playwright releases without blindly rewriting advice every time a package version changes.

For each meaningful Playwright release, answer four questions:

1. What changed upstream?
2. Which Field Guide claims, examples, or workflows could be affected?
3. Do executable examples still pass on the new version?
4. Does any engineering recommendation need to change, or only its verification date/version assumption?

## Release-review workflow

### 1. Read authoritative upstream material

Start with Playwright's official release notes and documentation. Do not base guidance changes on social posts or secondary summaries when the upstream behavior is documented.

### 2. Classify the release

Use one or more categories:

- **No Field Guide impact** — new functionality or fixes that do not alter existing guidance.
- **Example impact** — an API or behavior used by executable/sample code changed.
- **Guidance impact** — an upstream recommendation or default changed enough that our advice should be revised.
- **Opportunity** — a new capability deserves a recipe, FAQ entry, or deeper guide.
- **CI/runtime impact** — browser, Node.js, dependency, installation, reporter, sharding, or execution behavior changed.

### 3. Run validation

At minimum:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:docs
```

When reviewing a proposed Playwright dependency update, run the executable examples against that proposed version before merging.

### 4. Search version-sensitive content

Review guides containing:

- `Last verified` markers;
- Playwright API names changed by the release;
- CI/runtime assumptions;
- browser behavior affected by the release;
- official recommendations that changed upstream.

Do not update every verification marker merely because a release exists. A marker means the guide was actually reviewed.

### 5. Record the decision

A release-review PR or issue should contain:

```text
Playwright release:
Review date:
Upstream release notes reviewed:
Executable examples:
Affected Field Guide files:
Guidance changes required:
New coverage worth adding:
Decision:
```

### 6. Merge intentionally

Dependency automation may propose the version bump. It must not automatically reinterpret Field Guide advice.

If tests pass and no guidance changes are required, record that conclusion explicitly. “No documentation change” is a valid reviewed outcome.

## What executable examples prove

Passing examples prove that the checked code paths still execute under the tested Playwright version and browser environment.

They do **not** prove that every prose recommendation remains correct.

For example, an old locator API might continue to work even after Playwright changes its preferred best-practice guidance. That requires documentation review, not only green tests.

## What link checking proves

A successful link check can show that referenced pages still resolve.

It does **not** prove that the content behind those links still supports the Field Guide's claim.

Freshness therefore needs both automation and editorial review.

## Version policy

The repository should maintain one pinned Playwright development dependency for executable documentation. Dependency automation may propose updates through pull requests.

Why pin it?

- CI results correspond to a known version.
- update PRs create an explicit review event;
- failures are attributable to a concrete version change;
- the guide does not silently begin testing against a newer dependency than maintainers reviewed.

## Node.js policy

Use an actively supported Node.js release in CI and declare it explicitly in workflows. When changing the CI Node.js version, treat that as a runtime-policy review rather than an incidental edit.

## Review cadence

Use two triggers:

- **event-driven:** dependency/update PR when a newer Playwright version is available;
- **scheduled:** periodic freshness workflow to catch link rot and ensure the executable suite still runs even when no content PR is active.

## Anti-patterns

### Automatically changing `Last verified`

A timestamp update without review destroys the meaning of the marker.

### Automatically rewriting prose from release notes

Release notes identify changes; they do not know the intent or tradeoffs of this guide.

### Assuming green executable tests mean guidance is current

Runtime compatibility and editorial correctness are related but different properties.

### Copying the upstream changelog

The Field Guide should interpret impact for test engineers rather than duplicate Playwright's own release history.

## Official references

- [Playwright release notes](https://playwright.dev/docs/release-notes)
- [Playwright documentation](https://playwright.dev/docs/intro)

---

**Maintenance principle:** automate detection and execution; require human judgment for guidance.
