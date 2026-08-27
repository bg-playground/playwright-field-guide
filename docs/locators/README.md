# Locator Strategy

> Choose locators that describe **what the user can perceive and operate**, not how today's DOM happens to be assembled.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26  
**Primary references:** [Playwright locators](https://playwright.dev/docs/locators), [best practices](https://playwright.dev/docs/best-practices)

## The short version

Playwright recommends prioritizing user-facing attributes and explicit contracts such as test IDs. In practice, a useful default decision order is:

1. `getByRole()` when the element has meaningful accessible semantics.
2. `getByLabel()` for form controls with a label.
3. Other user-facing locators such as `getByPlaceholder()`, `getByText()`, `getByAltText()`, or `getByTitle()` when they express the intended target well.
4. `getByTestId()` when user-facing semantics are ambiguous, unstable, or unavailable and the application provides a deliberate testing contract.
5. CSS or XPath when the target cannot be expressed clearly through the higher-level locator APIs.

This is a **decision heuristic**, not a universal ranking. The best locator is the one that is unique, resilient, understandable, and aligned with the behavior your test intends to exercise.

## Locator decision tree

```text
Can a user identify the target by semantic role + accessible name?
├─ yes → getByRole()
└─ no
   ├─ Is it a labeled form control?
   │  ├─ yes → getByLabel()
   │  └─ no
   │     ├─ Is another user-facing attribute/text the stable identity?
   │     │  ├─ yes → getByPlaceholder/getByText/getByAltText/getByTitle
   │     │  └─ no
   │     │     ├─ Is there a deliberate test contract?
   │     │     │  ├─ yes → getByTestId()
   │     │     │  └─ no → narrowly scoped CSS/XPath, with justification
```

Before accepting the result, ask one more question:

> If this locator matches more than one element, what user-visible context distinguishes the one I mean?

Usually the answer should lead to scoping, filtering, or a stronger accessible name rather than `nth()`.

## 1. Prefer role when semantics are meaningful

```ts
await page.getByRole('button', { name: 'Save changes' }).click();
```

This communicates both the kind of control and how a user identifies it.

Compare:

```ts
// ❌ Coupled to DOM and styling implementation.
await page.locator('div.toolbar > button.primary:nth-child(2)').click();
```

A role locator can also expose accessibility problems. If something visually behaves like a button but has no usable button semantics or accessible name, difficulty locating it semantically may be useful product feedback rather than a reason to immediately reach for CSS.

### Accessible name is not always visible text

The name used by `getByRole()` comes from the accessibility tree. It may be influenced by visible text, associated labels, `aria-label`, `aria-labelledby`, alt text, and other accessibility rules.

```html
<button aria-label="Delete invoice">
  <svg><!-- trash icon --></svg>
</button>
```

```ts
await page.getByRole('button', { name: 'Delete invoice' }).click();
```

When a role locator surprises you, inspect the accessible semantics rather than assuming Playwright is matching arbitrary text.

## 2. Use labels for form controls

```ts
await page.getByLabel('Email address').fill('qa@example.com');
await page.getByLabel('Remember me').check();
```

This is usually stronger than locating an input by generated ID, CSS class, or DOM position.

```ts
// ❌ Implementation detail.
await page.locator('#input-7f3c').fill('qa@example.com');
```

If the form has no usable label, consider whether that is an accessibility issue worth fixing in the product.

## 3. Use text when text is actually the identity

`getByText()` is useful for non-interactive content and for elements whose visible text is the meaningful target.

```ts
await expect(page.getByText('Payment declined')).toBeVisible();
```

For interactive controls, role plus accessible name often communicates intent more precisely:

```ts
// Usually clearer for a button than text alone.
await page.getByRole('button', { name: 'Continue' }).click();
```

### Beware repeated text

A dashboard may contain the word `Active` dozens of times. The solution is usually context, not a positional shortcut.

```ts
const row = page.getByRole('row').filter({ hasText: 'Acme Corp' });
await expect(row.getByText('Active')).toBeVisible();
```

## 4. Test IDs are a valid contract, not a failure

Playwright supports locating by test ID and allows the test-id attribute to be configured.

```html
<button data-testid="checkout-submit">Place order</button>
```

```ts
await page.getByTestId('checkout-submit').click();
```

**Engineering recommendation:** use a test ID when it creates a clearer and more stable contract than the available user-facing attributes.

Good candidates include:

- highly dynamic controls whose visible copy changes frequently,
- canvas-like or custom widgets with weak native semantics,
- repeated components where a stable domain identity is important,
- or UI where localization makes visible copy unsuitable for the test's purpose.

Do not add test IDs to every node merely to recreate CSS selectors with a different spelling.

```html
<!-- ❌ Test IDs that encode DOM position are not a meaningful contract. -->
<div data-testid="container-3-row-2-cell-4"></div>
```

Prefer names tied to stable product concepts.

## 5. Scope before reaching for `nth()`

Suppose a page has several `Edit` buttons.

```ts
// ❌ Works until ordering changes.
await page.getByRole('button', { name: 'Edit' }).nth(2).click();
```

Find the containing concept first:

```ts
const card = page.getByRole('article').filter({ hasText: 'Enterprise plan' });
await card.getByRole('button', { name: 'Edit' }).click();
```

Or use a parent whose accessible identity is explicit:

```ts
const dialog = page.getByRole('dialog', { name: 'Shipping address' });
await dialog.getByRole('button', { name: 'Save' }).click();
```

**Context dependent:** positional locators such as `first()`, `last()`, and `nth()` are legitimate when position itself is the behavior under test. They are suspicious when position is merely being used to silence a uniqueness problem.

## 6. Locator strictness is useful feedback

Playwright locators are strict for operations that imply a single target. If an action locator resolves to multiple elements, Playwright can fail rather than guessing which one you meant.

Treat that failure as design feedback:

```ts
// Ambiguous if two buttons are named Delete.
await page.getByRole('button', { name: 'Delete' }).click();
```

Ask what distinguishes the intended delete operation: invoice, row, dialog, card, account, or another domain concept.

```ts
const invoiceRow = page.getByRole('row').filter({ hasText: 'INV-1042' });
await invoiceRow.getByRole('button', { name: 'Delete' }).click();
```

The resulting test is more explicit about intent.

## 7. Filter collections by meaning

Playwright's locator filtering is useful for tables, cards, lists, and repeated components.

```ts
const product = page
  .getByRole('listitem')
  .filter({ hasText: 'Noise-canceling headphones' });

await product.getByRole('button', { name: 'Add to cart' }).click();
```

You can also filter using another locator:

```ts
const row = page.getByRole('row').filter({
  has: page.getByRole('cell', { name: 'brad@example.com' }),
});

await row.getByRole('button', { name: 'Deactivate' }).click();
```

Prefer the smallest stable domain context that makes the target unambiguous.

## 8. Dynamic UI does not automatically require dynamic selectors

Generated IDs and changing CSS classes often tempt tests toward selector construction.

```ts
// ❌ Mirrors implementation churn.
await page.locator(`[id="customer-${customer.id}-actions-menu"]`).click();
```

If the UI exposes the customer's identity, scope semantically instead:

```ts
const customer = page.getByRole('row').filter({ hasText: 'Ada Lovelace' });
await customer.getByRole('button', { name: 'Actions' }).click();
```

**Context dependent:** a stable domain ID can be an excellent test contract when duplicate display names are possible. The issue is not that IDs are inherently bad; it is whether the selector represents a stable contract or incidental implementation.

## 9. Responsive layouts can create duplicate controls

Some applications render both desktop and mobile navigation in the DOM and hide one with CSS. A locator that was unique at one viewport may become ambiguous at another.

Do not automatically fix this with `.first()`.

Investigate whether:

- hidden and visible variants both have accessible semantics,
- the product should remove hidden content from the accessibility tree,
- the locator can be scoped to the active navigation region,
- or the test genuinely needs viewport-specific behavior.

Example:

```ts
const navigation = page.getByRole('navigation', { name: 'Primary' });
await navigation.getByRole('link', { name: 'Account' }).click();
```

## 10. CSS and XPath are escape hatches, not forbidden tools

Playwright supports CSS and XPath selectors. The problem is not their existence; it is their tendency to couple tests to implementation details.

Fragile:

```ts
await page.locator('#app > div:nth-child(2) > div > ul > li:nth-child(4) > button').click();
```

A DOM refactor can break this without changing anything a user sees.

A narrow CSS selector can still be reasonable when:

- the target has no meaningful accessible representation,
- the selector uses a deliberate stable application contract,
- you are testing implementation-specific behavior where DOM structure matters,
- or a third-party component cannot be changed.

When you use CSS/XPath, leave the next maintainer enough context to understand why a higher-level locator was not suitable.

## 11. Avoid encoding incidental copy when the copy is not the contract

Suppose a product team experiments with CTA copy:

- `Start free trial`
- `Try it free`
- `Begin trial`

If your test's purpose is to verify the exact copy, a text-based locator/assertion is appropriate.

If the purpose is to verify that the canonical signup action works across copy experiments, a stable test ID or another semantic contract may be more appropriate.

This is why locator strategy cannot be reduced to “role is always better than test ID.” The locator should align with what the test is meant to notice when it changes.

## 12. Do not hide weak locators inside Page Objects

This:

```ts
await checkoutPage.submitOrder();
```

may look clean while hiding:

```ts
page.locator('div:nth-child(4) > button').click();
```

Abstraction does not create resilience. Locator quality should be reviewed where locators are defined, even when tests interact through page/component objects.

## Locator review checklist

Before accepting a locator, ask:

- Does it describe something meaningful to the user or domain?
- Is it unique for the intended operation?
- Will routine DOM/styling refactors leave it intact?
- If visible copy changes, **should** this test fail?
- Is there a stable accessible name?
- Would a test ID create a clearer explicit contract?
- Am I using `nth()` because position matters or because my locator is ambiguous?
- Have I scoped repeated controls to their meaningful container?
- Does it behave correctly across the projects/viewports this test runs against?
- If I used CSS/XPath, can I explain why?

## Related field guides

- [Reliable Test Design](../reliable-test-design/README.md)
- [Locator Decision Examples](decision-examples.md)
- Fixtures, Authentication & Test Data *(v0.1 PR 4)*
- Architecture *(v0.1 PR 5)*

## Official references

- [Playwright: Locators](https://playwright.dev/docs/locators)
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright: Other Locators](https://playwright.dev/docs/other-locators)
- [Playwright: Test Configuration — testIdAttribute](https://playwright.dev/docs/test-use-options)

---

**Verification note:** Playwright-specific claims and examples were reviewed against the official references above on 2026-08-26.
