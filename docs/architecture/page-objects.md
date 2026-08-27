# Page Objects: Decision Guide

> Page Objects are a tool for managing meaningful UI behavior, not a prerequisite for professional Playwright automation.

**Advice type:** Official Playwright pattern + engineering recommendation  
**Last verified:** 2026-08-26

## Should I create a Page Object?

Use this decision flow:

```text
Is this behavior used in more than one meaningful scenario?
├─ no → keep it in the test unless complexity alone justifies extraction
└─ yes
   ├─ Is it primarily reusable setup/state? → consider a fixture/helper
   ├─ Is it one reusable UI region? → consider a component object
   ├─ Is it substantial behavior centered on one page? → consider a Page Object
   └─ Does it span several pages around one business operation? → consider a workflow/domain helper
```

Then ask:

> Does the abstraction make the test easier to understand without making failures harder to trace?

If not, do not add it yet.

## A useful Page Object API speaks domain language

Weak:

```ts
await ordersPage.clickOrdersTab();
await ordersPage.fillSearchInput(orderNumber);
await ordersPage.clickSearchButton();
await ordersPage.clickFirstResult();
```

Stronger:

```ts
await ordersPage.openOrder(orderNumber);
```

The stronger API hides mechanics that are not the purpose of the calling test.

## But do not hide the scenario

Too abstract:

```ts
await app.completeEverythingForHappyPath(customer);
```

The reader no longer knows what behavior is being exercised.

A good abstraction compresses implementation detail while preserving the business story.

## Page Object responsibilities

Good responsibilities often include:

- navigation specific to the page;
- stable page-level operations;
- locating meaningful page state;
- coordinating components that belong to the page;
- translating low-level UI mechanics into domain language.

Suspicious responsibilities include:

- creating arbitrary backend data;
- managing every page in the application;
- reading environment variables directly;
- containing unrelated API clients;
- swallowing all assertions;
- retry loops that duplicate Playwright waiting;
- test orchestration across unrelated domains.

## Constructor design

Simple is usually enough:

```ts
export class ProfilePage {
  constructor(private readonly page: Page) {}
}
```

If a page has reusable components, compose them:

```ts
export class ProfilePage {
  readonly navigation: PrimaryNavigation;
  readonly avatarUploader: AvatarUploader;

  constructor(private readonly page: Page) {
    this.navigation = new PrimaryNavigation(
      page.getByRole('navigation', { name: 'Primary' }),
    );
    this.avatarUploader = new AvatarUploader(
      page.getByRole('region', { name: 'Profile photo' }),
    );
  }
}
```

This is generally easier to reason about than inheriting components from a large base page.

## Locator properties vs methods

Either can be appropriate.

A stable element can be a property:

```ts
readonly saveButton = this.page.getByRole('button', { name: 'Save' });
```

A locator depending on input is naturally a method:

```ts
orderRow(orderNumber: string) {
  return this.page.getByRole('row').filter({ hasText: orderNumber });
}
```

Avoid caching element handles or snapshots of dynamic state when a Locator can re-resolve against the current DOM.

## Assertions inside Page Objects

There are three reasonable styles.

### Style A: expose locators, assert in tests

```ts
status() {
  return this.page.getByRole('status');
}
```

```ts
await expect(profile.status()).toHaveText('Profile updated');
```

**Good for:** keeping scenario outcomes visible.

### Style B: semantic assertion methods

```ts
async expectProfileUpdated() {
  await expect(this.page.getByRole('status')).toHaveText('Profile updated');
}
```

**Good for:** repeated, stable domain assertions.

### Style C: operation verifies its own invariant

```ts
async open() {
  await this.page.goto('/profile');
  await expect(
    this.page.getByRole('heading', { name: 'Profile' }),
  ).toBeVisible();
}
```

**Good for:** proving that the abstraction itself reached the state it promises.

No single style must own every assertion. Prefer consistency and visible test intent.

## Avoid boolean wrappers around dynamic UI

Weak:

```ts
async isOrderVisible(orderNumber: string) {
  return this.orderRow(orderNumber).isVisible();
}
```

This invites:

```ts
expect(await orders.isOrderVisible(orderNumber)).toBe(true);
```

Better:

```ts
orderRow(orderNumber: string) {
  return this.page.getByRole('row').filter({ hasText: orderNumber });
}
```

Then:

```ts
await expect(orders.orderRow(orderNumber)).toBeVisible();
```

The retrying assertion remains intact.

## Avoid the BasePage gravity well

A common progression is:

```text
BasePage
├── click()
├── fill()
├── wait()
├── screenshot()
├── apiRequest()
├── login()
├── logout()
├── parseDate()
└── dozens more
```

Soon every page inherits a general utility framework.

This often adds little because Playwright's `Page` and `Locator` APIs already provide the browser primitives.

Prefer:

- small utilities for truly generic logic;
- fixtures for environment/dependency setup;
- component composition for reusable UI;
- workflow helpers for cross-page domain behavior.

## Avoid wrapping Playwright just to rename Playwright

Low-value wrapper:

```ts
async click(locator: Locator) {
  await locator.click();
}
```

It adds indirection without adding meaning.

Higher-value abstraction:

```ts
async approveApplication(applicationId: string) {
  const row = this.applicationRow(applicationId);
  await row.getByRole('button', { name: 'Review' }).click();
  await this.reviewDialog.approve();
}
```

The latter represents application behavior.

## When duplication is acceptable

Two tests both contain:

```ts
await page.getByLabel('Search').fill(query);
await page.getByRole('button', { name: 'Search' }).click();
```

That does not automatically justify `SearchPage`.

Wait until the repeated behavior has enough weight or change frequency that centralizing it improves the suite.

A little duplication can preserve clarity while the design is still emerging.

## Refactoring signal: change amplification

A strong reason to introduce an object is **change amplification**.

If one UI change requires editing 25 tests in the same conceptual way, a missing abstraction may exist.

If those 25 tests only share one incidental selector but otherwise mean different things, centralizing that selector may or may not improve the design. Examine the concept, not only the diff count.

## Refactoring signal: unreadable scenario

If a test's business story is buried beneath repeated mechanical interaction:

```ts
await page.getByRole('link', { name: 'Team' }).click();
await page.getByRole('button', { name: 'Invite' }).click();
await page.getByLabel('Email').fill(email);
await page.getByLabel('Role').selectOption('editor');
await page.getByRole('button', { name: 'Send invitation' }).click();
```

and many tests repeat that journey, this can become:

```ts
await members.invite(email, 'editor');
```

The abstraction has earned a meaningful name.

## Refactoring signal: component reuse

If the same date picker appears on six pages, creating six page-level implementations is duplication at the wrong boundary.

Prefer a `DatePicker` component object rooted at the relevant widget.

This is one reason component objects often scale better than increasingly large page classes.

## Review checklist

Before merging a Page Object, ask:

- What stable concept does this class represent?
- Are its methods named after user/domain behavior rather than raw Playwright calls?
- Is the class cohesive?
- Are locators resilient according to the locator guide?
- Are retrying assertions preserved?
- Are important scenario outcomes still visible to the test reader?
- Would composition be clearer than inheritance?
- Is this solving current complexity rather than hypothetical scale?
- Could a component, fixture, or helper be the more accurate boundary?

## Official references

- [Playwright: Page object models](https://playwright.dev/docs/pom)
- [Playwright: Locators](https://playwright.dev/docs/locators)
- [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures)

---

**Verification note:** Playwright's documented Page Object Model pattern and Locator/Fixture behavior were reviewed against the official references above on 2026-08-26. The architectural decision guidance is a Field Guide engineering recommendation.
