# Test Data Patterns

> The most useful test data is not merely unique. It has a clear owner, a deliberate lifetime, and enough identity to diagnose a failure.

**Last verified:** 2026-08-26

## Pattern 1: Create the smallest valid scenario

Avoid a universal setup that creates every possible entity for every test.

```ts
const customer = await customerFactory.create({
  status: 'active',
  plan: 'enterprise',
});
```

The factory can provide sensible defaults while the test states the attributes that matter.

## Pattern 2: Prefer domain factories over raw payload duplication

### Repetitive

```ts
await request.post('/api/customers', {
  data: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    country: 'US',
    plan: 'enterprise',
    status: 'active',
    // 20 more required defaults...
  },
});
```

### Intent-focused

```ts
const customer = await customerFactory.create({
  plan: 'enterprise',
});
```

Keep factories close enough to the domain that required defaults are centralized, but do not hide scenario-defining attributes from the test.

## Pattern 3: Tie created data to execution identity

A useful identifier can answer “where did this record come from?”

```ts
const externalId = [
  'e2e',
  testInfo.project.name,
  testInfo.parallelIndex,
  testInfo.testId,
].join('-');
```

The exact format depends on system constraints. Hash long test IDs if necessary.

Benefits:

- fewer collisions,
- easier cleanup,
- easier CI investigation,
- easier identification of abandoned data.

## Pattern 4: Return created resources from fixtures

```ts
customer: async ({ request }, use) => {
  const customer = await createCustomer(request);
  await use(customer);
  await deleteCustomer(request, customer.id);
},
```

The test receives the exact resource it owns rather than searching for “the latest test customer.”

## Pattern 5: Cleanup by identity, not by pattern

### Dangerous

```ts
await deleteWhereNameStartsWith('Playwright Test');
```

### Better

```ts
await deleteCustomer(request, customer.id);
```

Broad cleanup queries are dangerous under parallelism and when multiple CI runs share an environment.

## Pattern 6: Make cleanup idempotent when practical

A test may partially delete its own resource before fixture teardown executes.

```ts
async function deleteCustomerIfPresent(request, id: string) {
  const response = await request.delete(`/api/customers/${id}`);

  if (![204, 404].includes(response.status())) {
    throw new Error(`Unexpected cleanup status: ${response.status()}`);
  }
}
```

Whether `404` is acceptable depends on the API and scenario. The principle is to distinguish “already gone” from a real cleanup failure.

## Pattern 7: Do not let cleanup erase evidence too early

Automatic teardown is convenient, but sometimes a failed test leaves data that is valuable for diagnosis.

Options include:

- attach the created resource IDs before cleanup,
- log cleanup targets,
- retain failed-run data in dedicated disposable environments,
- or make cleanup policy configurable for local debugging.

Do not retain sensitive or production-like data casually. Diagnostic value must be balanced with privacy, cost, and environment hygiene.

## Pattern 8: Seed randomness and retain the seed

Randomized values can expand coverage:

```ts
const seed = testInfo.retry * 1000 + testInfo.parallelIndex;
const data = generateCustomer(seed);
```

The important property is reproducibility. If a generated case fails, the report should contain enough information to regenerate it.

Cryptographically random UUIDs are fine for collision-resistant identity; they are less useful when randomness determines the actual behavioral input unless that input is also recorded.

## Pattern 9: Separate immutable reference data from mutable test data

A suite may safely share read-only reference data such as:

- country codes,
- product catalog fixtures,
- static permission definitions,
- known feature metadata.

Mutable resources such as carts, drafts, preferences, balances, and workflow states need explicit ownership.

Do not apply the same isolation policy blindly to both categories.

## Pattern 10: Avoid “latest record” queries

### Fragile

```ts
const order = await getLatestOrderForAccount(account.id);
```

Parallel tests can change what “latest” means.

### Better

```ts
const order = await createOrderForTest(account.id, externalId);
const loaded = await getOrder(order.id);
```

Use identity returned from creation whenever possible.

## Pattern 11: Keep test data setup out of Page Objects

A Page Object should generally model UI interaction, not silently provision database state.

```ts
// Suspicious responsibility mix.
await checkoutPage.createPaidOrderViaApi();
```

Prefer a data/domain helper or fixture:

```ts
const order = await orderFactory.createPaid();
await checkoutPage.open(order.id);
```

This keeps UI modeling and data provisioning independently understandable.

## Pattern 12: Use API setup without pretending it proves the UI setup path

If a test creates an order by API and cancels it through the UI, name the test around cancellation behavior.

Do not claim that the same test validates signup, catalog search, checkout, payment, and cancellation end-to-end.

A trustworthy suite is explicit about what each layer proves.

## Pattern 13: Think about concurrent CI runs, not just local workers

Per-worker uniqueness protects workers **inside one Playwright run**. It may not protect two GitHub Actions jobs, two developers, or two shards running against the same backend.

Include a run-level namespace when environments are shared:

```text
e2e-<run-id>-<project>-<parallel-index>-<test-id>
```

CI systems usually expose a run/build identifier that can participate in this namespace.

## Pattern 14: Data lifetime should match test purpose

| Data | Typical lifetime |
| --- | --- |
| UI-only browser state | one test/browser context |
| Scenario record mutated by one test | one test |
| Account safely shared by tests in one worker | one worker |
| Immutable reference dataset | environment/run |
| Prepared shared auth state for read-only tests | run or until expiration |

These are starting points, not rules. Choose the shortest lifetime that is practical and safe.

## Test data review checklist

- Is the data mutable?
- Who owns it?
- Can another worker or CI run see it?
- Is identity returned from creation and reused directly?
- Can cleanup target only owned data?
- Is random behavioral input reproducible?
- Does the test expose the attributes that define its scenario?
- Is setup using UI only when UI setup is relevant to the test?
- Can a failed record be traced back to the run/test that created it?
- Are sensitive values kept out of logs and generated names?

## Related field guides

- [Fixtures, Authentication & Test Data](README.md)
- [Authentication Decision Guide](authentication-decision-guide.md)
- [Reliable Test Design](../reliable-test-design/README.md)

---

**Verification note:** Playwright-specific concepts were reviewed against the official fixture, authentication, and isolation documentation on 2026-08-26; data-lifecycle recommendations are Field Guide engineering guidance.
