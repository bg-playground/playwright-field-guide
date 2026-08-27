# Locator Decision Examples

> The goal is not to memorize a selector hierarchy. It is to choose the locator that best represents the contract your test cares about.

**Last verified:** 2026-08-26

## Quick reference

| Situation | Strong starting point |
| --- | --- |
| Named button/link/menu item | `getByRole()` + accessible name |
| Labeled input/checkbox/radio | `getByLabel()` |
| Status/error/static message | `getByText()` or semantic role |
| Image identified by alt text | `getByAltText()` |
| Input primarily identified by placeholder | `getByPlaceholder()` |
| Stable explicit automation contract | `getByTestId()` |
| Repeated item in table/list/cards | semantic container + `filter()` + child locator |
| Third-party/custom DOM with no usable semantics | narrow CSS/XPath if necessary |

## Example: button

### Fragile

```ts
await page.locator('.btn.btn-primary').click();
```

### Better

```ts
await page.getByRole('button', { name: 'Create account' }).click();
```

Why: the test describes the control's role and accessible identity rather than its styling classes.

## Example: input

### Fragile

```ts
await page.locator('form > div:nth-child(2) input').fill('qa@example.com');
```

### Better

```ts
await page.getByLabel('Email address').fill('qa@example.com');
```

Why: rearranging form markup should not break the test if the user-facing form remains equivalent.

## Example: exact product row

### Fragile

```ts
await page.getByRole('button', { name: 'Add to cart' }).nth(3).click();
```

### Better

```ts
const product = page
  .getByRole('listitem')
  .filter({ hasText: 'Mechanical Keyboard' });

await product.getByRole('button', { name: 'Add to cart' }).click();
```

Why: the test chooses the product by identity rather than current ordering.

## Example: duplicate names require a domain identity

Two customers may both be named `Alex Smith`. Visible text alone is not enough.

If the UI exposes email:

```ts
const row = page.getByRole('row').filter({
  has: page.getByRole('cell', { name: 'alex.smith@example.com' }),
});

await row.getByRole('button', { name: 'Open' }).click();
```

If the stable customer ID is intentionally exposed as a test contract:

```ts
const customer = page.getByTestId(`customer-${customerId}`);
await customer.getByRole('button', { name: 'Open' }).click();
```

The second pattern is not inferior merely because it uses a test ID. It may represent the domain identity more accurately.

## Example: icon-only control

HTML:

```html
<button aria-label="Close dialog">
  <svg aria-hidden="true"><!-- icon --></svg>
</button>
```

Test:

```ts
await page.getByRole('button', { name: 'Close dialog' }).click();
```

Avoid targeting the SVG path or icon class. The operable control is the button.

## Example: text assertion vs control interaction

For a message:

```ts
await expect(page.getByText('Your password has been reset')).toBeVisible();
```

For a button with the same text:

```ts
await page.getByRole('button', { name: 'Reset password' }).click();
```

The role gives the interaction additional meaning.

## Example: modal with repeated Save buttons

### Ambiguous

```ts
await page.getByRole('button', { name: 'Save' }).click();
```

### Scoped

```ts
const dialog = page.getByRole('dialog', { name: 'Edit profile' });
await dialog.getByRole('button', { name: 'Save' }).click();
```

This also makes the test easier to read: save **inside Edit profile**.

## Example: table row actions

```ts
const invoice = page.getByRole('row').filter({ hasText: 'INV-1042' });

await expect(invoice.getByRole('cell', { name: '$125.00' })).toBeVisible();
await invoice.getByRole('button', { name: 'More actions' }).click();
```

The row is the domain context. Child locators describe behavior inside it.

## Example: localization

Suppose the same test runs against multiple locales and the exact translated CTA is not what the test intends to validate.

A test ID may provide a cleaner cross-locale contract:

```ts
await page.getByTestId('checkout-submit').click();
```

If localization itself is under test, then visible text and accessible names should be part of the assertions instead.

The choice depends on what change the test is supposed to detect.

## Example: responsive navigation

### Risky

```ts
await page.getByText('Settings').first().click();
```

This may accidentally select a hidden desktop or mobile copy.

### Better

```ts
const nav = page.getByRole('navigation', { name: 'Primary' });
await nav.getByRole('link', { name: 'Settings' }).click();
```

If the application exposes two `Primary` navigations simultaneously to the accessibility tree, that may itself deserve product investigation.

## Example: exact text is a requirement

If the requirement says the destructive button must read `Permanently delete account`, asserting exact copy is appropriate:

```ts
await expect(
  page.getByRole('button', { name: 'Permanently delete account', exact: true }),
).toBeVisible();
```

Do not deliberately make the locator insensitive to a change that the test is supposed to catch.

## Example: CSS can be appropriate

Suppose a third-party chart library renders data points as SVG paths without accessible semantics and cannot be modified.

```ts
const points = page.locator('svg.revenue-chart path[data-series="actual"]');
await expect(points).toHaveCount(12);
```

This may be a reasonable implementation-level assertion. Document why the selector is necessary and recognize that library upgrades may require maintenance.

## Example: `nth()` is correct when position is the requirement

If the requirement is specifically about the first search result:

```ts
const firstResult = page.getByRole('listitem').first();
await expect(firstResult).toContainText('Playwright');
```

Position is meaningful here. This is different from using `.first()` simply because the locator unexpectedly matches two unrelated controls.

## Example: chaining can express intent

```ts
const settings = page.getByRole('region', { name: 'Notification settings' });
const email = settings.getByLabel('Email alerts');

await email.check();
await expect(email).toBeChecked();
```

A chain is useful when each level adds meaningful context. Avoid chains that merely reproduce the DOM tree.

## Code review exercise

For each locator below, ask whether it expresses a stable user/domain contract:

```ts
page.locator('#root > div:nth-child(2) button')
page.getByText('Submit')
page.getByRole('button', { name: 'Submit application' })
page.getByTestId('application-submit')
page.getByRole('row').filter({ hasText: applicantEmail })
```

There is no context-free winner between the last three. The test's purpose determines whether visible copy, accessible semantics, or an explicit automation contract should cause the test to fail when changed.

## Related field guides

- [Locator Strategy](README.md)
- [Reliable Test Design](../reliable-test-design/README.md)
- [Why Is My Playwright Test Flaky?](../reliable-test-design/flakiness-diagnostic.md)

## Official references

- [Playwright: Locators](https://playwright.dev/docs/locators)
- [Playwright: Best Practices](https://playwright.dev/docs/best-practices)

---

**Verification note:** Playwright-specific claims and examples were reviewed against the official references above on 2026-08-26.
