# Network & Browser Recipes

> Focused Playwright patterns for the browser behaviors that deserve explicit synchronization and scope.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26

## Wait for a specific response

```ts
const responsePromise = page.waitForResponse(
  response =>
    response.url().includes('/api/search') && response.status() === 200,
);

await page.getByRole('button', { name: 'Search' }).click();
const response = await responsePromise;
```

Use this when the response itself matters or when it is the correct coordination point.

## Mock a response

```ts
await page.route('**/api/recommendations', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [] }),
  });
});
```

Use controlled responses for deterministic edge states. Document what integration is no longer being exercised.

## Modify a real response

```ts
await page.route('**/api/profile', async route => {
  const response = await route.fetch();
  const json = await response.json();

  await route.fulfill({
    response,
    json: {
      ...json,
      plan: 'enterprise',
    },
  });
});
```

This can be useful when you want most of the real response but need to control one field.

## Block an optional dependency

```ts
await page.route('**/analytics/**', route => route.abort());
```

Use this only when the dependency is intentionally outside the scenario's purpose. Do not hide a dependency that the test is supposed to validate.

## Assert a request payload

```ts
const requestPromise = page.waitForRequest('**/api/orders');

await page.getByRole('button', { name: 'Place order' }).click();

const request = await requestPromise;
expect(request.postDataJSON()).toMatchObject({
  shippingMethod: 'express',
});
```

This is useful when the browser-side request contract itself matters.

## Download a file

```ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download invoice' }).click();
const download = await downloadPromise;

expect(download.suggestedFilename()).toBe('invoice.pdf');
```

If contents matter, persist/read the file and assert the relevant contents rather than checking only the filename.

## Upload a file

```ts
await page.getByLabel('Upload resume').setInputFiles('fixtures/resume.pdf');
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByRole('status')).toHaveText('Upload complete');
```

## Use a file chooser

For custom upload UI:

```ts
const chooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Choose file' }).click();
const chooser = await chooserPromise;
await chooser.setFiles('fixtures/resume.pdf');
```

Register the event wait before clicking.

## Handle a popup

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Open preview' }).click();
const popup = await popupPromise;

await expect(popup.getByRole('heading', { name: 'Preview' })).toBeVisible();
```

## Handle a new page from the browser context

```ts
const pagePromise = context.waitForEvent('page');
await page.getByRole('button', { name: 'Open dashboard' }).click();
const dashboard = await pagePromise;
```

Use context-level page events when the new page is not necessarily a direct popup of the current page.

## Work with two actors

When two users need isolated browser state, use separate contexts.

```ts
const adminContext = await browser.newContext({ storageState: 'admin.json' });
const customerContext = await browser.newContext({ storageState: 'customer.json' });

const adminPage = await adminContext.newPage();
const customerPage = await customerContext.newPage();
```

This is stronger than two pages in one context when cookies/storage/session must differ.

## Work inside an iframe

```ts
const frame = page.frameLocator('iframe[title="Payment"]');
await frame.getByLabel('Card number').fill('4111111111111111');
```

Prefer stable frame identity over positional frame indexes.

## Handle a JavaScript dialog

```ts
page.once('dialog', async dialog => {
  expect(dialog.message()).toContain('Delete this item?');
  await dialog.accept();
});

await page.getByRole('button', { name: 'Delete' }).click();
```

Register the handler first.

## Observe console errors

```ts
const errors: string[] = [];

page.on('console', message => {
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});

// exercise scenario

expect(errors).toEqual([]);
```

**Context dependent:** many applications intentionally log some console errors from third-party scripts. Define what belongs in scope rather than globally failing on every console error without review.

## Capture page errors

```ts
const pageErrors: Error[] = [];
page.on('pageerror', error => pageErrors.push(error));

// exercise scenario

expect(pageErrors).toEqual([]);
```

This can reveal uncaught browser exceptions that do not immediately break the UI.

## Use `expect.poll` for non-DOM eventual state

```ts
await expect.poll(async () => {
  const response = await request.get(`/api/jobs/${jobId}`);
  const body = await response.json();
  return body.status;
}).toBe('complete');
```

This can be useful for backend jobs when polling is genuinely the system contract.

Do not use it to avoid a better browser-visible synchronization point when the UI already exposes completion.

## Use `expect.toPass` carefully

Retrying a block can be useful for eventually consistent multi-step checks, but it can also hide broad nondeterminism.

Prefer a narrow assertion or poll when possible so the failing condition remains obvious.

## Avoid event-order races

Risky:

```ts
await page.getByRole('button', { name: 'Export' }).click();
const download = await page.waitForEvent('download');
```

Better:

```ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export' }).click();
const download = await downloadPromise;
```

The listener is ready before the event can occur.

## Avoid broad network waiting

Risky:

```ts
await page.waitForLoadState('networkidle');
```

as a universal “page ready” primitive.

Prefer:

```ts
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
```

or a specific response/state tied to the scenario.

## Recipe review checklist

- Is the event listener registered before the trigger?
- Is the network wait specific enough to identify the intended request/response?
- Does the mocked behavior change the scope of the test?
- Are multiple users isolated with contexts when necessary?
- Are downloads/uploads asserted beyond “no exception” when the file matters?
- Is an iframe selected by stable identity?
- Is polling reserved for genuinely eventually consistent state?
- Are console/page-error assertions scoped to known application behavior?

## Related field guides

- [API + Advanced Playwright](README.md)
- [API vs UI: Decision Guide](api-vs-ui.md)
- [Reliable Test Design](../reliable-test-design/README.md)

## Official references

- [Playwright: Network](https://playwright.dev/docs/network)
- [Playwright: Downloads](https://playwright.dev/docs/downloads)
- [Playwright: Pages](https://playwright.dev/docs/pages)
- [Playwright: Frames](https://playwright.dev/docs/frames)
- [Playwright: Dialogs](https://playwright.dev/docs/dialogs)
- [Playwright: Assertions](https://playwright.dev/docs/test-assertions)

---

**Verification note:** Playwright-specific patterns were reviewed against official documentation on 2026-08-26.
