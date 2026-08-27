# API + Advanced Playwright

> Use the narrowest layer that proves the behavior you care about. Browser tests are powerful, but not every prerequisite or assertion belongs in the browser.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26  
**Primary references:** [API testing](https://playwright.dev/docs/api-testing), [network](https://playwright.dev/docs/network), [downloads](https://playwright.dev/docs/downloads), [pages](https://playwright.dev/docs/pages), [frames](https://playwright.dev/docs/frames)

## The short version

A mature Playwright suite often uses three layers deliberately:

```text
API-only
  → fastest way to verify service behavior directly

API-assisted UI
  → establish state quickly, then verify the user-facing behavior

Browser-only
  → prove interactions, rendering, navigation, accessibility, browser integration, or end-user journeys
```

The goal is not to minimize browser coverage at all costs. It is to keep each test focused on the behavior it is meant to prove.

## Choose the test layer by the claim

Ask:

> What claim should fail if this behavior regresses?

Examples:

| Claim | Strong starting layer |
| --- | --- |
| API rejects invalid payload | API |
| UI renders validation returned by API | API-assisted UI or browser |
| Checkout button is accessible and submits | Browser |
| Backend creates order correctly | API |
| UI can download generated invoice | Browser |
| Third-party outage produces correct fallback UI | Mocked/intercepted browser test |
| Real third-party integration works | Integration/E2E with real dependency |

## API-only testing

Playwright's `APIRequestContext` lets you test HTTP APIs directly.

```ts
test('creates customer via API', async ({ request }) => {
  const response = await request.post('/api/customers', {
    data: {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    },
  });

  expect(response.ok()).toBeTruthy();

  const customer = await response.json();
  expect(customer.email).toBe('ada@example.com');
});
```

Use API-only tests when the behavior under test is an API contract, business rule, or backend response that does not require browser behavior to prove it.

## API-assisted UI setup

Do not force every browser test to create all prerequisites through the UI.

```ts
test('customer can edit an existing order', async ({ page, request }) => {
  const order = await createOrder(request);

  await page.goto(`/orders/${order.id}`);
  await page.getByRole('button', { name: 'Edit order' }).click();

  // ...browser behavior under test...
});
```

This keeps the test focused on editing rather than retesting order creation.

**Tradeoff:** if the scenario is specifically the full create → edit journey, API setup would change the scope and should not replace that end-to-end test.

## API assertions after UI behavior

A browser action can be verified through both UI and API when persistence matters.

```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('status')).toHaveText('Saved');

const response = await request.get(`/api/orders/${orderId}`);
const order = await response.json();
expect(order.status).toBe('approved');
```

This can be valuable when the UI confirmation is transient but the actual requirement is persisted backend state.

Do not automatically duplicate every UI assertion at the API layer. Add the second assertion only when it proves something meaningfully different.

## Network observation vs mocking

Playwright can observe and intercept browser network traffic.

Use observation when you want to inspect real traffic:

```ts
const responsePromise = page.waitForResponse(
  response =>
    response.url().includes('/api/search') && response.status() === 200,
);

await page.getByRole('button', { name: 'Search' }).click();
const response = await responsePromise;
```

Use interception/mocking when the dependency itself is not what you are trying to validate.

```ts
await page.route('**/api/recommendations', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [] }),
  });
});
```

Then test the UI behavior for the controlled response.

## What mocking proves—and what it does not

A mocked browser test can prove:

- your UI handles a response shape correctly;
- edge/error states are rendered correctly;
- rare conditions can be tested deterministically.

It does **not** prove:

- the real upstream service returns that response shape;
- authentication between systems works;
- network routing works;
- production headers/caching/CORS are correct;
- the integration is operational.

Mocking narrows the test. That is useful when done deliberately.

## Downloads

Playwright can wait for a download before triggering the action.

```ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download invoice' }).click();
const download = await downloadPromise;

expect(download.suggestedFilename()).toBe('invoice.pdf');
```

If file contents matter, save/read the download in a controlled temporary location and assert the relevant behavior.

Do not rely only on “the click did not throw.”

## Uploads

Use `setInputFiles()` for file input controls.

```ts
await page.getByLabel('Upload document').setInputFiles('fixtures/sample.pdf');
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByRole('status')).toHaveText('Upload complete');
```

If the application uses a custom file picker, target the underlying file input or use Playwright's file chooser event when appropriate.

## Popups and new pages

Wait for the new page before performing the action that opens it.

```ts
const pagePromise = page.context().waitForEvent('page');
await page.getByRole('link', { name: 'Open report' }).click();
const reportPage = await pagePromise;

await reportPage.waitForLoadState();
await expect(reportPage.getByRole('heading', { name: 'Report' })).toBeVisible();
```

Do not click first and then hope the popup is still discoverable.

## Multiple tabs/pages

Each page in a browser context is a distinct `Page` object.

Use clear names:

```ts
const adminPage = page;
const customerPage = await context.newPage();
```

For multi-user workflows, consider separate browser contexts when browser state must be isolated between actors.

## Frames and iframes

Use `frameLocator()` when interacting with iframe content.

```ts
const paymentFrame = page.frameLocator('iframe[title="Payment"]');
await paymentFrame.getByLabel('Card number').fill('4111111111111111');
```

Avoid brittle frame index assumptions when the iframe has a stable identity.

## Browser dialogs

Register dialog handling before the action that triggers it.

```ts
page.once('dialog', async dialog => {
  expect(dialog.type()).toBe('confirm');
  await dialog.accept();
});

await page.getByRole('button', { name: 'Delete' }).click();
```

## Waiting for network vs waiting for UI

A network response can be the correct synchronization point when the response itself is what the test cares about.

But for user-facing behavior, prefer the user-visible outcome when possible.

```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('status')).toHaveText('Saved');
```

The UI assertion keeps the test aligned with the user experience.

Use `waitForResponse()` when it adds a distinct guarantee, such as verifying a specific request/response contract or coordinating an otherwise unobservable operation.

## Avoid `networkidle` as a universal readiness signal

Modern applications may keep background connections open or continuously poll.

A page having “no active network requests” is often not the same as “the application is ready for the behavior under test.”

Prefer a specific UI condition, response, or application state tied to the scenario.

## Hybrid workflow example

```ts
test('admin can deactivate a customer', async ({ page, request }) => {
  // Arrange through API.
  const customer = await createCustomer(request);

  // Act through UI.
  await page.goto('/admin/customers');
  const row = page.getByRole('row').filter({ hasText: customer.email });
  await row.getByRole('button', { name: 'Deactivate' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Assert visible user outcome.
  await expect(row.getByText('Inactive')).toBeVisible();

  // Assert persisted backend state where it adds value.
  const response = await request.get(`/api/customers/${customer.id}`);
  const body = await response.json();
  expect(body.active).toBe(false);
});
```

This test uses each layer for a specific responsibility.

## Advanced feature checklist

Before using an advanced Playwright API, ask:

- What behavior does this test claim to prove?
- Is browser interaction necessary for that claim?
- Can prerequisite state be created more reliably through API/fixture setup?
- If mocking, what real integration is no longer being exercised?
- If waiting on network, is the response itself the contract or just a proxy for UI readiness?
- If using multiple pages/contexts, is state isolation explicit?
- If downloading/uploading, are contents/outcomes verified?
- If using frames/popups/dialogs, are event listeners registered before the triggering action?

## Related field guides

- [API vs UI Decision Guide](api-vs-ui.md)
- [Network & Browser Recipes](network-browser-recipes.md)
- [Fixtures, Authentication & Test Data](../fixtures-auth-test-data/README.md)
- [Reliable Test Design](../reliable-test-design/README.md)

## Official references

- [Playwright: API testing](https://playwright.dev/docs/api-testing)
- [Playwright: Network](https://playwright.dev/docs/network)
- [Playwright: Downloads](https://playwright.dev/docs/downloads)
- [Playwright: Pages](https://playwright.dev/docs/pages)
- [Playwright: Frames](https://playwright.dev/docs/frames)
- [Playwright: Dialogs](https://playwright.dev/docs/dialogs)
- [Playwright: File uploads](https://playwright.dev/docs/input#upload-files)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26.
