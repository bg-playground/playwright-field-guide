# Playwright Field Recipes

> Copy the shape, understand the contract, then adapt it to your application.

**Last verified:** 2026-08-26

These recipes are deliberately small. They solve a concrete job while linking back to the deeper design guidance.

## Wait for a meaningful UI state

```ts
await page.getByRole('button', { name: 'Generate report' }).click();
await expect(page.getByRole('status')).toHaveText('Report ready');
```

Prefer this over an arbitrary timeout. See [Reliable Test Design](../docs/reliable-test-design/README.md).

## Scope a repeated action to one row

```ts
const row = page.getByRole('row').filter({ hasText: 'INV-1042' });
await row.getByRole('button', { name: 'More actions' }).click();
```

This is usually stronger than selecting the third matching button. See [Locator Strategy](../docs/locators/README.md).

## Assert an eventually updated value

```ts
await expect(page.getByRole('status')).toHaveText('Saved');
```

Keep the assertion web-first rather than taking a one-time snapshot with `isVisible()` or `textContent()` and asserting afterward.

## Create prerequisite data through the API

```ts
test('customer edits an existing order', async ({ request, page }) => {
  const response = await request.post('/api/orders', {
    data: { productId: 'sku-123', quantity: 1 },
  });
  expect(response.ok()).toBeTruthy();

  const order = await response.json();
  await page.goto(`/orders/${order.id}`);

  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Order updated');
});
```

Use this when order creation is prerequisite state rather than the behavior under test.

## Verify a UI action through the API

```ts
await page.getByRole('button', { name: 'Activate account' }).click();
await expect(page.getByRole('status')).toHaveText('Account activated');

const response = await request.get(`/api/accounts/${accountId}`);
expect(response.ok()).toBeTruthy();
expect((await response.json()).status).toBe('active');
```

This can prove both user-visible feedback and persisted state when both matter.

## Wait for the request caused by an action

```ts
const responsePromise = page.waitForResponse(
  response =>
    response.url().includes('/api/orders') &&
    response.request().method() === 'POST',
);

await page.getByRole('button', { name: 'Place order' }).click();
const response = await responsePromise;

expect(response.ok()).toBeTruthy();
```

Register the wait before the action so a fast response cannot win the race.

## Mock a rare backend error

```ts
await page.route('**/api/payment', async route => {
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Payment service unavailable' }),
  });
});

await page.goto('/checkout');
await page.getByRole('button', { name: 'Pay now' }).click();
await expect(page.getByRole('alert')).toContainText('Try again later');
```

This proves client behavior for the simulated response, not the real payment integration.

## Upload a file

```ts
await page.getByLabel('Upload receipt').setInputFiles('fixtures/receipt.pdf');
```

Prefer `setInputFiles()` when you can target the file input directly.

## Handle a file chooser

```ts
const chooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Choose file' }).click();
const chooser = await chooserPromise;
await chooser.setFiles('fixtures/avatar.png');
```

Register the event listener before the click.

## Download a file

```ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('link', { name: 'Download invoice' }).click();
const download = await downloadPromise;

await download.saveAs(`artifacts/${download.suggestedFilename()}`);
```

Remember that temporary downloads are tied to the browser context lifecycle.

## Work inside an iframe

```ts
const paymentFrame = page.frameLocator('iframe[title="Payment"]');
await paymentFrame.getByLabel('Card number').fill('4111111111111111');
```

Keep the iframe boundary explicit rather than hiding it in brittle selector syntax.

## Handle a popup

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Open receipt' }).click();
const popup = await popupPromise;

await expect(popup.getByRole('heading', { name: 'Receipt' })).toBeVisible();
```

Again, register the event wait before the triggering action.

## Model two users in one test

```ts
const adminContext = await browser.newContext();
const memberContext = await browser.newContext();

const adminPage = await adminContext.newPage();
const memberPage = await memberContext.newPage();

// Authenticate each context independently, then exercise the interaction.
```

Use separate contexts when independent browser state is part of the scenario.

## Attach useful diagnostic context

```ts
await testInfo.attach('order-context', {
  body: JSON.stringify({ orderId, tenantId }, null, 2),
  contentType: 'application/json',
});
```

Attach safe identifiers that shorten investigation. Do not attach secrets, tokens, or sensitive customer data.

## Repeat one test to investigate intermittency

```bash
npx playwright test tests/checkout.spec.ts --repeat-each=20
```

Use repetition as an experiment, not as proof that a test is reliable.

## Compare concurrency behavior

```bash
npx playwright test tests/checkout.spec.ts --workers=1
npx playwright test tests/checkout.spec.ts --workers=4
```

If failures appear only under concurrency, investigate shared accounts, records, quotas, services, and runner capacity.

## Use a test ID as an explicit contract

```ts
await page.getByTestId('checkout-submit').click();
```

This is appropriate when the test ID expresses stable product intent better than volatile visible copy or weak semantics.

## Build a reusable component object

```ts
export class CartSummary {
  constructor(private readonly root: Locator) {}

  async remove(name: string) {
    const item = this.root.getByRole('listitem').filter({ hasText: name });
    await item.getByRole('button', { name: 'Remove' }).click();
  }
}
```

Root component objects at meaningful UI regions rather than making them mini global page objects.

## Expose a locator instead of a boolean

```ts
status() {
  return this.page.getByRole('status');
}
```

Then:

```ts
await expect(profile.status()).toHaveText('Profile updated');
```

This preserves Playwright's retrying assertion behavior.

## Run a conservative CI baseline

```ts
export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

Scale concurrency after proving that the suite and environment can support it. See [CI & Debugging](../docs/ci-debugging/README.md).

## Recipe index by problem

| Problem | Start with |
| --- | --- |
| Timing/race | meaningful UI state, request/event wait |
| Duplicate locator | semantic scope + filter |
| Expensive prerequisite UI | API setup |
| Rare frontend error state | route/mock |
| Multi-user scenario | separate browser contexts |
| CI intermittency | trace + repeat/concurrency experiment |
| Reusable UI region | component object |
| Dynamic assertion | expose locator + web-first expect |

## Deeper guides

- [Reliable Test Design](../docs/reliable-test-design/README.md)
- [Locator Strategy](../docs/locators/README.md)
- [Fixtures, Authentication & Test Data](../docs/fixtures-auth-test-data/README.md)
- [Playwright Test Architecture](../docs/architecture/README.md)
- [CI & Debugging](../docs/ci-debugging/README.md)
- [API + Advanced Playwright](../docs/api-advanced/README.md)
