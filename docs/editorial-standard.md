# Editorial Standard

The Playwright Field Guide distinguishes between upstream Playwright guidance and project-level engineering judgment. This is a core credibility rule, not a formatting preference.

## Advice labels

### 📘 Official Playwright guidance

Use this label when the recommendation is directly supported by current Playwright documentation. Link to the authoritative Playwright page and avoid overstating what the source says.

### 🧭 Engineering recommendation

Use this label for advice based on maintainability, reliability, architecture, or delivery experience that is not presented by Playwright as a universal rule.

### ⚖️ Context dependent

Use this label when multiple approaches are legitimate and the right choice depends on application behavior, team constraints, risk, scale, or test portfolio design.

## Preferred guide structure

Substantial guides should normally contain:

1. **Recommendation** — the practical answer first.
2. **Why it matters** — the reliability or engineering consequence.
3. **Good example** — a focused, copyable implementation.
4. **Anti-pattern** — a realistic failure-prone alternative.
5. **Exceptions and tradeoffs** — where the recommendation should bend.
6. **Official Playwright references** — authoritative upstream sources where applicable.
7. **Last verified** — the Playwright version or verification date for version-sensitive material.

Short recipes do not need to force all seven sections when doing so would add noise.

## Writing principles

- Prefer concrete user behavior over abstract framework terminology.
- Explain *why* a pattern is safer, not merely that it is preferred.
- Keep examples small enough that the important decision is obvious.
- Do not hide material setup inside unexplained helper functions.
- Use TypeScript for the default examples unless another language is specifically relevant.
- Avoid invented certainty. Say when advice depends on context.
- Prefer official Playwright documentation as the source of truth for Playwright behavior.
- Do not copy upstream documentation; summarize, interpret, and link.
- Treat flakiness as a diagnosable engineering problem, not something retries automatically solve.

## Code example markers

Use comments sparingly to emphasize the engineering distinction:

```ts
// ❌ Fragile: coupled to DOM structure.
await page.locator('#content > div:nth-child(2) > button').click();

// ✅ Better: expresses the user-facing contract.
await page.getByRole('button', { name: 'Save' }).click();
```

Avoid labeling a pattern “wrong” when it is merely context dependent.

## Freshness

Version-sensitive pages should end with a compact freshness note. Example:

> **Last verified:** Playwright 1.x, YYYY-MM-DD. Check the linked official documentation if you are using a newer release.

When Playwright changes the relevant behavior or recommendation, update the guide and its verification marker together.
