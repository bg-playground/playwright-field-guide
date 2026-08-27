# Authentication Decision Guide

> Choose authentication based on **state contention**, not merely on how quickly you can log in.

**Last verified:** 2026-08-26

## Fast decision table

| Situation | Starting strategy |
| --- | --- |
| Tests are read-only or do not conflict through account state | Shared authenticated state |
| Parallel tests modify account/server-side state | One account/state per parallel worker |
| Tests make incompatible mutations even within a worker | Account/state per test |
| Login UI is not under test and API login is stable | Authenticate through API |
| Login UI itself is under test | Exercise login through UI |
| Test needs admin and user simultaneously | Separate browser contexts/states |
| Test verifies signed-out behavior | Explicit empty storage state |

## Question 1: Can all tests safely share one account?

Imagine every test using the account at exactly the same time.

Do they change any of these?

- profile settings,
- feature preferences,
- cart contents,
- saved searches,
- notifications,
- permissions,
- messages,
- account-scoped records,
- quotas or usage counters?

If those changes can affect another test, do not treat one shared account as isolated simply because each test has a fresh browser context.

## Question 2: Is one account per worker enough?

Per-worker authentication is a strong compromise when:

- account creation/login is expensive,
- tests in different workers must not collide,
- tests assigned to the same worker can safely reuse the account,
- and test-created domain data is independently owned.

Playwright's authentication guidance recommends this model for parallel tests that modify server-side state.

Use `parallelIndex` when assigning a stable account to a parallel worker slot.

## Question 3: Does the test need its own account?

Per-test accounts can be appropriate for:

- account deletion,
- signup/onboarding,
- role mutation,
- destructive preference changes,
- security/account-lock scenarios,
- or suites where same-worker tests cannot safely share server-side identity.

The cost is more setup, account provisioning, and cleanup.

Do not pay that cost when a less isolated strategy is already safe.

## Question 4: UI login or API login?

Ask what behavior the test is supposed to validate.

### Login behavior is under test

Use the UI.

```ts
await page.goto('/login');
await page.getByLabel('Email').fill(user.email);
await page.getByLabel('Password').fill(user.password);
await page.getByRole('button', { name: 'Sign in' }).click();
await expect(page).toHaveURL('/dashboard');
```

### Login is prerequisite setup

If the application provides a stable API flow, authenticate through `APIRequestContext`, save storage state, and start the scenario already authenticated.

This reduces duplicated UI work and keeps unrelated tests focused.

## Question 5: Where should storage state live?

Playwright recommends a `playwright/.auth` directory that is ignored by Git when you want auth files in a conventional project location.

```gitignore
playwright/.auth
```

If state only needs to live for the current run, the project's output directory is attractive because Playwright cleans it between runs.

Never commit live authenticated state. It can contain sensitive cookies or headers.

## Question 6: How do I test multiple roles?

### Separate tests by role

Use role-specific storage states:

```ts
test.use({ storageState: 'playwright/.auth/admin.json' });
```

### Two roles in one scenario

Create independent contexts:

```ts
const manager = await browser.newContext({ storageState: managerState });
const employee = await browser.newContext({ storageState: employeeState });

const managerPage = await manager.newPage();
const employeePage = await employee.newPage();
```

This is appropriate for workflows where one actor's action should become visible to another.

Remember to close contexts you create manually.

## Question 7: How do I test logged-out behavior when auth is configured globally?

Reset storage state for the relevant file or group:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

This is clearer than attempting to log out at the beginning of every signed-out test.

## Question 8: What about session storage?

Playwright's normal `storageState` flow covers browser state such as cookies and local storage, but session storage requires special handling when an application uses it for authentication-related data.

Treat this as an application-specific exception. Do not build custom session-storage persistence unless the application actually requires it.

See the official authentication documentation for the current supported-state details and example workaround.

## Authentication smells

Investigate when you see:

- every test performing the same UI login,
- a single mutable account used by all parallel workers,
- committed `storageState` files,
- credentials hard-coded in tests,
- state saved immediately after clicking Sign in without proving login completed,
- tests depending on logout cleanup from a previous test,
- admin/user state selected through global mutable variables,
- or authentication retries hiding an unreliable environment.

## A useful suite split

A mature suite often has all of these at once:

```text
small login/authentication coverage
    → exercises real login UI

large authenticated feature coverage
    → reuses prepared storage state

state-changing parallel coverage
    → uses per-worker accounts/state

account-lifecycle coverage
    → uses per-test identities
```

There is no requirement to choose one authentication strategy for the entire repository.

## Official references

- [Playwright: Authentication](https://playwright.dev/docs/auth)
- [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures)
- [Playwright: WorkerInfo](https://playwright.dev/docs/api/class-workerinfo)

---

**Verification note:** Playwright-specific claims were reviewed against the official references above on 2026-08-26.
