# Fixtures, Authentication & Test Data

> Browser isolation is only half the problem. Reliable suites also need explicit ownership of accounts, records, authentication state, and cleanup.

**Advice type:** Official Playwright guidance + engineering recommendation  
**Last verified:** 2026-08-26  
**Primary references:** [Playwright fixtures](https://playwright.dev/docs/test-fixtures), [authentication](https://playwright.dev/docs/auth)

## The short version

Use Playwright fixtures to provide tests with the environment and resources they need. Choose scope based on ownership and lifetime:

- **test-scoped fixture** — fresh or independently owned state for each test;
- **worker-scoped fixture** — expensive or shared setup that can safely be reused by tests in one worker;
- **project setup/dependencies** — prerequisite work that should run before dependent projects, such as preparing shared authentication state;
- **hooks** — lifecycle actions that genuinely apply to a group of tests, not a substitute for every reusable dependency.

For authentication, ask one question first:

> Can every test using this account run at the same time without changing state that another test cares about?

If **yes**, shared authenticated state can be appropriate. If **no**, allocate accounts or mutable state per worker or test.

## Decision model

```text
What does the test need?
├─ Fresh/independent resource for every test
│  └─ test-scoped fixture
├─ Expensive resource safely reusable inside one worker
│  └─ worker-scoped fixture
├─ Shared prerequisite for a project
│  └─ setup project / project dependency
└─ Simple lifecycle action applying to a test group
   └─ hook may be enough

Authentication:
Can parallel tests safely use the same account?
├─ yes → shared storage state may be appropriate
└─ no  → per-worker or per-test account/state
```

## 1. Fixtures express dependencies

Playwright fixtures are composable, reusable, and created on demand. A test declares what it needs in its fixture arguments.

```ts
import { test as base } from '@playwright/test';

type Fixtures = {
  customer: Customer;
};

export const test = base.extend<Fixtures>({
  customer: async ({ request }, use) => {
    const customer = await createCustomer(request);

    await use(customer);

    await deleteCustomer(request, customer.id);
  },
});
```

```ts
test('customer can edit profile', async ({ page, customer }) => {
  await page.goto(`/customers/${customer.id}`);
  // ...
});
```

The fixture communicates that the test requires an owned customer and gives setup/teardown a natural home.

## 2. Fixtures vs hooks

Hooks are not bad. They are simply a different abstraction.

### A hook can be enough

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/settings');
});
```

This is readable when every test in the group genuinely begins on the settings page.

### Prefer a fixture when the setup is a reusable capability

```ts
export const test = base.extend<{ settingsPage: SettingsPage }>({
  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await use(settingsPage);
  },
});
```

Fixtures become especially useful when setup:

- is reused across files,
- has teardown,
- has dependencies of its own,
- should run only when requested,
- produces a typed value for the test,
- or needs test vs worker scope.

**Engineering recommendation:** do not convert every three-line `beforeEach` into a fixture merely because fixtures are powerful. Use the abstraction that makes ownership and intent clearest.

## 3. Test scope vs worker scope

Playwright test-scoped fixtures are set up for each test. Worker-scoped fixtures are set up once for a worker process and reused by tests executed by that worker.

### Test-scoped resource

```ts
export const test = base.extend<{ order: Order }>({
  order: async ({ request }, use) => {
    const order = await createOrder(request);
    await use(order);
    await deleteOrder(request, order.id);
  },
});
```

Use this when tests may mutate the resource independently.

### Worker-scoped resource

```ts
type WorkerFixtures = {
  workerAccount: Account;
};

export const test = base.extend<{}, WorkerFixtures>({
  workerAccount: [
    async ({}, use, workerInfo) => {
      const account = await acquireAccount(workerInfo.parallelIndex);
      await use(account);
      await releaseAccount(account);
    },
    { scope: 'worker' },
  ],
});
```

Use worker scope when reuse is safe and valuable. Authentication accounts are a common example for tests that mutate server-side state but can safely share one account **within** a worker.

### `parallelIndex` vs `workerIndex`

Playwright exposes both. `parallelIndex` identifies a parallel worker slot and remains the same if a worker is restarted after a failure; `workerIndex` identifies the worker process itself and changes on restart.

For assigning a stable account to a parallel slot, `parallelIndex` is often the more useful identity.

## 4. Browser context isolation does not isolate your database

Playwright gives each test an isolated browser context by default. That isolates browser-side state such as cookies and local storage.

It does **not** isolate:

- the user's server-side preferences,
- shopping carts stored in the backend,
- shared inboxes,
- records in a database,
- queues,
- feature flags,
- files in shared storage,
- or third-party account state.

This can still flake:

```ts
test('turns notifications on', async ({ page }) => {
  // uses qa@example.com
});

test('turns notifications off', async ({ page }) => {
  // also uses qa@example.com
});
```

Separate browser contexts do not prevent those tests from racing over the same backend preference.

## 5. Choose an authentication strategy from server-side behavior

Playwright supports reusing authenticated browser state through `storageState`.

### Shared account: good when tests do not conflict

Official Playwright guidance recommends shared authentication state when tests can run simultaneously with the same account without affecting one another.

Typical examples:

- read-only pages,
- independent records not tied to mutable account settings,
- authorization smoke checks where account state is not changed.

A setup project can authenticate once and save state:

```ts
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

```ts
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
```

### Per-worker account: good for mutable account state

When tests modify shared server-side state, Playwright recommends using different accounts for parallel workers.

```ts
const id = test.info().parallelIndex;
const account = await acquireAccount(id);
```

Authenticate that account once per worker, save its storage state under the project's output directory, and let tests in that worker reuse it.

### Per-test account: strongest isolation, highest cost

Use a unique account per test when tests make incompatible mutations even within one worker, when account lifecycle itself is under test, or when the risk of state leakage outweighs setup cost.

This is an engineering tradeoff rather than a default requirement.

## 6. Treat storage state as a secret

Playwright's authentication documentation warns that saved browser state may contain cookies or headers capable of impersonating the test account.

Do not commit authentication state.

```gitignore
playwright/.auth
```

Prefer credentials from your CI secret store and generate state during the run or in an appropriate setup step.

If authentication state does not need to persist between runs, storing it beneath the Playwright project output directory can simplify cleanup.

## 7. Wait for authentication to be complete before saving state

A successful click on `Sign in` does not necessarily mean all authentication cookies have been established.

```ts
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('/dashboard');
await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
await page.context().storageState({ path: authFile });
```

Choose a final URL or user-visible state that proves the login flow reached its stable authenticated state before persisting storage.

## 8. API authentication can be the right shortcut

If the application supports a stable authentication API, Playwright can authenticate through `APIRequestContext` and save request storage state.

```ts
setup('authenticate via API', async ({ request }) => {
  await request.post('/api/login', {
    data: {
      email: process.env.E2E_USER,
      password: process.env.E2E_PASSWORD,
    },
  });

  await request.storageState({ path: authFile });
});
```

**Context dependent:** use UI login when the login UI is what you need to test. Use API authentication when login is merely prerequisite setup for unrelated scenarios.

Do not force hundreds of tests through the login UI just to prove the same login behavior hundreds of times.

## 9. Multiple roles deserve explicit state

Admin/user workflows often need multiple identities.

A simple project/file strategy can save separate states:

```ts
test.use({ storageState: 'playwright/.auth/admin.json' });
```

For a test that needs two users simultaneously, create separate contexts:

```ts
const adminContext = await browser.newContext({ storageState: adminState });
const userContext = await browser.newContext({ storageState: userState });

const adminPage = await adminContext.newPage();
const userPage = await userContext.newPage();
```

This models two independent browser sessions and is useful for workflows such as approvals, messaging, invitations, or permission changes.

## 10. Build test data around ownership

A good data strategy answers:

- Who created this resource?
- Which test or worker owns it?
- Can another test mutate it?
- How is its identity made unique?
- Who cleans it up?
- What happens if the test crashes before teardown?

### Prefer explicit factories

```ts
const customer = await customerFactory.create({
  plan: 'enterprise',
  status: 'active',
});
```

A factory should create the smallest valid state needed for the scenario while making meaningful overrides obvious.

Avoid enormous “god fixtures” that create an entire business universe for every test.

## 11. API setup often beats UI setup

Suppose the behavior under test is canceling an order.

### Expensive and fragile prerequisite path

```text
UI signup
→ UI add address
→ UI search catalog
→ UI add to cart
→ UI checkout
→ UI payment
→ finally test cancellation
```

### Narrower test

```text
API/fixture creates cancellable order
→ UI opens order
→ UI cancels order
→ assertion proves cancellation
```

The second test is not “less end-to-end” by accident; it is intentionally scoped to cancellation behavior.

Keep a smaller number of broader journey tests when the complete workflow itself is valuable to validate.

## 12. Cleanup must also be parallel-safe

Dangerous cleanup:

```ts
await deleteAllCustomersWhoseNameStartsWith('E2E');
```

One worker can delete another worker's active data.

Prefer ownership-aware cleanup:

```ts
const customer = await createCustomer(request, {
  externalId: `e2e-${testInfo.testId}`,
});

await use(customer);

await deleteCustomer(request, customer.id);
```

**Engineering recommendation:** make teardown idempotent where practical. A failed setup or partially deleted resource should not turn teardown into a second unrelated failure.

## 13. Unique names are useful, but uniqueness should be reproducible

Random UUIDs prevent collisions, but a failing test is easier to investigate when its created data can be traced back to the test run.

Consider identities that include meaningful execution metadata:

```ts
const externalId = `e2e-${testInfo.project.name}-${testInfo.parallelIndex}-${testInfo.testId}`;
```

Exact schemes vary by system. The goal is collision resistance **and** traceability.

Be mindful of application length/character constraints and never place secrets in generated identifiers.

## 14. Automatic fixtures are powerful; use them deliberately

Playwright supports automatic fixtures that run even when a test does not explicitly request them.

They are useful for cross-cutting concerns such as collecting extra diagnostics on failure.

They can also create invisible work and make suite behavior harder to understand.

**Engineering recommendation:** use automatic fixtures for genuinely universal infrastructure, not as a hidden replacement for explicit test dependencies.

## 15. Fixture teardown follows ownership

Fixture setup happens before `await use(value)`. Teardown happens afterward.

```ts
resource: async ({}, use) => {
  const resource = await createResource();

  await use(resource);

  await destroyResource(resource);
},
```

Dependencies are torn down in the reverse ownership order: if fixture A depends on B, B outlives A.

This makes fixtures a strong fit for resources with explicit lifecycle.

## Review checklist

Before accepting a fixture/auth/data design, ask:

- Does fixture scope match the resource's safe lifetime?
- Can every parallel test using an account coexist safely?
- Is backend state isolated, not just browser state?
- Are stored auth files excluded from source control?
- Does login state get saved only after authentication is complete?
- Is UI setup being used because it is under test, or merely because it was easiest to write?
- Can data be traced to its owning test/worker/run?
- Can cleanup delete another test's resources?
- Is teardown resilient to partial failure?
- Are fixtures explicit enough that a reader knows what the test depends on?
- Is a worker fixture actually safe to share for every test that may land on that worker?

## Related field guides

- [Authentication Decision Guide](authentication-decision-guide.md)
- [Test Data Patterns](test-data-patterns.md)
- [Reliable Test Design](../reliable-test-design/README.md)
- [Locator Strategy](../locators/README.md)
- Architecture *(v0.1 PR 5)*

## Official references

- [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures)
- [Playwright: Authentication](https://playwright.dev/docs/auth)
- [Playwright: Browser contexts / isolation](https://playwright.dev/docs/browser-contexts)
- [Playwright: WorkerInfo](https://playwright.dev/docs/api/class-workerinfo)
- [Playwright: Timeouts](https://playwright.dev/docs/test-timeouts)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26.
