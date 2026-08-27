# Architecture by Suite Size

> Architecture should evolve in response to observed complexity. Do not make a ten-test suite pay the maintenance cost of a thousand-test suite.

**Advice type:** Engineering recommendation + context dependent  
**Last verified:** 2026-08-26

The examples below are not templates to copy exactly. They show how structure can grow as the suite earns additional boundaries.

## Small suite: keep the path short

**Typical signals:**

- a handful of test files;
- one or two product areas;
- little repeated setup;
- one authentication role;
- contributors can easily find behavior.

Possible structure:

```text
tests/
├── login.spec.ts
├── profile.spec.ts
├── checkout.spec.ts
└── support/
    └── helpers.ts

playwright.config.ts
```

A test can use Playwright directly:

```ts
test('user changes display name', async ({ page }) => {
  await page.goto('/profile');
  await page.getByLabel('Display name').fill('Ada');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Profile updated');
});
```

### Do not add yet without evidence

- `BasePage`;
- repository-wide service containers;
- factories for every primitive;
- five abstraction layers;
- a Page Object for each URL;
- custom wrappers around `Page` and `Locator`.

The suite is small enough that directness is a feature.

## Medium suite: name repeated concepts

**Typical signals:**

- dozens or low hundreds of tests;
- several authentication roles;
- repeated domain setup;
- common components;
- repeated page behavior;
- parallel execution matters.

Possible structure:

```text
tests/
├── checkout/
│   ├── checkout.spec.ts
│   ├── checkout.page.ts
│   └── cart-summary.component.ts
├── account/
│   ├── profile.spec.ts
│   └── profile.page.ts
├── admin/
│   ├── users.spec.ts
│   └── users.page.ts
└── support/
    ├── fixtures.ts
    ├── auth.ts
    └── data-builders.ts

playwright.config.ts
```

The architecture now names concepts that repeat:

```ts
export const test = base.extend<{
  customer: Customer;
  checkout: CheckoutPage;
}>({
  customer: async ({ request }, use) => {
    const customer = await customerFactory.create(request);
    await use(customer);
    await customerFactory.delete(request, customer.id);
  },

  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});
```

### What earned the extra structure?

- customer creation is repeated test state;
- checkout behavior is used by multiple scenarios;
- cleanup ownership matters;
- the cart is a reusable component;
- tests benefit from feature-local files.

The abstractions correspond to observed responsibilities.

## Production-scale suite: explicit boundaries

**Typical signals:**

- hundreds or thousands of tests;
- multiple teams contributing;
- many product domains;
- several roles/tenants;
- parallel CI and sharding;
- shared test-data services;
- common components and cross-page workflows;
- maintenance ownership matters as much as code reuse.

One possible structure:

```text
tests/
├── commerce/
│   ├── checkout/
│   │   ├── specs/
│   │   ├── checkout.page.ts
│   │   ├── payment.component.ts
│   │   └── checkout.workflow.ts
│   └── orders/
│       ├── specs/
│       └── orders.page.ts
├── identity/
│   ├── authentication/
│   └── profile/
├── administration/
│   ├── users/
│   └── permissions/
└── support/
    ├── fixtures/
    ├── api-clients/
    ├── data-builders/
    ├── auth/
    └── diagnostics/
```

This structure separates product domains while retaining shared infrastructure where sharing is real.

### A workflow layer may now be justified

```ts
export class CheckoutWorkflow {
  constructor(
    private readonly checkout: CheckoutPage,
    private readonly payment: PaymentComponent,
  ) {}

  async placeOrder(order: OrderInput) {
    await this.checkout.enterShippingAddress(order.address);
    await this.payment.payWith(order.paymentMethod);
    await this.checkout.placeOrder();
  }
}
```

The workflow exists because the operation is repeated across many scenarios and spans meaningful components.

## Large does not mean abstract everything

Even in a thousand-test suite, a unique one-off scenario can remain direct:

```ts
test('legacy account sees migration notice', async ({ page }) => {
  // Clear, unique behavior can stay here.
});
```

Consistency does not require every interaction to pass through the maximum number of layers.

## Feature-oriented vs technical-type organization

### Technical-type organization

```text
pages/
components/
fixtures/
specs/
```

**Can work well when:**

- the suite is modest;
- pages are heavily shared;
- ownership is centralized;
- contributors know the entire application.

**Can hurt when:**

- every feature change touches distant directories;
- page directories become enormous;
- ownership follows product domains rather than technical types.

### Feature-oriented organization

```text
checkout/
account/
admin/
```

with specs and local abstractions near each feature.

**Can work well when:**

- teams own product domains;
- most abstractions are feature-specific;
- discoverability improves by keeping related behavior together.

**Can hurt when:**

- shared components are duplicated across features;
- support infrastructure becomes inconsistently reinvented.

A hybrid is common: feature-local behavior plus a deliberately small shared support layer.

## When to extract a shared abstraction

Do not promote something to global `support/` merely because two features use it.

Ask:

- Is the concept genuinely the same?
- Will it change for the same reasons?
- Is there one natural owner?
- Can its API remain narrow?

Two similar-looking date pickers owned by different products may not actually be the same component.

## When to split projects or configs

Playwright projects can represent different browsers, devices, environments, or configurations. Do not create separate Playwright projects merely to mirror every folder in the repository.

A project boundary is useful when tests need a distinct execution configuration, such as:

- browser/device;
- authenticated setup dependency;
- locale;
- environment option;
- or another meaningful `use`/execution configuration.

Folder structure and Playwright project structure solve different problems.

## Growth signals

| Signal | Likely response |
| --- | --- |
| Same setup repeated broadly | Fixture or data helper |
| Same UI widget repeated | Component object |
| Same substantial page behavior repeated | Page Object |
| Same journey crosses pages repeatedly | Workflow/domain helper |
| Shared helper file becomes a junk drawer | Split by responsibility |
| Page class becomes enormous | Extract components/workflows |
| Change requires edits across many tests | Look for missing stable concept |
| Contributors cannot find behavior | Revisit organization boundaries |
| Abstraction is used once and hides intent | Inline or simplify it |

## Architecture migration example

A suite might evolve like this:

### Month 1

```text
checkout.spec.ts
```

Direct Playwright. Good.

### Month 3

Five checkout tests repeat address entry and cart behavior.

```text
checkout/
├── checkout.spec.ts
├── checkout.page.ts
└── cart-summary.component.ts
```

The repeated concepts now have names.

### Month 8

Checkout supports multiple payment methods, roles, and order types. Other domains need completed orders as setup.

```text
checkout/
├── specs/
├── checkout.page.ts
├── payment.component.ts
└── checkout.workflow.ts

support/
├── fixtures/
└── data-builders/
```

The architecture evolved from pressure. It was not predicted on day one.

## The architecture smell test

A suite may be over-engineered when:

- reading a test requires opening five files;
- wrappers rename Playwright methods without adding domain meaning;
- every page inherits a large base class;
- fixtures inject dozens of unrelated objects;
- contributors fear changing shared helpers;
- one-line interactions require new classes;
- or architecture discussions focus on patterns more than test behavior.

A suite may be under-structured when:

- the same workflow is copied everywhere;
- UI changes require mechanical edits across dozens of tests;
- shared data ownership is unclear;
- helper files contain hundreds of unrelated functions;
- tests mix setup infrastructure, UI mechanics, and business intent into long scripts;
- or nobody knows which abstraction owns a repeated component.

The goal is not minimum code or maximum reuse. It is **appropriate structure**.

## Related field guides

- [Playwright Test Architecture](README.md)
- [Page Objects: Decision Guide](page-objects.md)
- [Fixtures, Authentication & Test Data](../fixtures-auth-test-data/README.md)
- [Locator Strategy](../locators/README.md)

## Official references

- [Playwright: Page object models](https://playwright.dev/docs/pom)
- [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures)
- [Playwright: Projects](https://playwright.dev/docs/test-projects)

---

**Verification note:** Playwright-specific capabilities referenced here were reviewed against official documentation on 2026-08-26. Suite-size structures are illustrative Field Guide recommendations, not prescribed Playwright architecture.
