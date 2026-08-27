# API vs UI: Decision Guide

> Choose the layer that most directly proves the behavior while keeping the test maintainable and honest about scope.

**Advice type:** Engineering recommendation + context dependent  
**Last verified:** 2026-08-26

## Decision flow

```text
Is the behavior fundamentally an HTTP/API contract?
├─ yes → start with an API test
└─ no
   ├─ Does the test need browser rendering/interaction/accessibility/navigation?
   │  ├─ yes → use browser coverage
   │  └─ no → prefer a lower layer if it proves the claim directly
   └─ Does browser setup contain prerequisites unrelated to the claim?
      ├─ yes → consider API-assisted UI setup
      └─ no → full browser flow may be appropriate
```

## Use API tests when

- validating status codes, payloads, validation rules, or service contracts;
- testing backend business rules directly;
- verifying setup/cleanup helpers;
- testing combinations that would be expensive to reach through UI;
- diagnosing whether a failure is browser-side or service-side.

## Use browser tests when

- interaction mechanics matter;
- user-visible rendering matters;
- accessibility semantics matter;
- navigation and routing matter;
- browser storage/cookies/session behavior matters;
- uploads/downloads/popups/frames matter;
- responsive or browser-specific behavior matters.

## Use API-assisted UI tests when

- the UI behavior under test needs substantial prerequisite state;
- setup through UI is slow or brittle;
- API setup does not bypass the behavior the scenario intends to prove.

Example:

```ts
test('user can cancel an existing subscription', async ({ page, request }) => {
  const subscription = await createActiveSubscription(request);

  await page.goto(`/subscriptions/${subscription.id}`);
  await page.getByRole('button', { name: 'Cancel subscription' }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();

  await expect(page.getByText('Cancelled')).toBeVisible();
});
```

## Do not use API setup when it changes the claim

If the claim is:

> A customer can complete checkout from an empty cart.

then creating the completed order directly by API avoids the behavior under test.

Layer choice is scope choice.

## API assertion after UI: when useful

Add an API verification when the backend state itself is meaningful and not fully proven by the visible UI.

```ts
await page.getByRole('button', { name: 'Approve' }).click();
await expect(page.getByText('Approved')).toBeVisible();

const response = await request.get(`/api/applications/${applicationId}`);
const application = await response.json();
expect(application.status).toBe('approved');
```

This can catch a UI that optimistically says success while persistence failed.

Do not duplicate every assertion in two layers by default.

## Mocking changes the question

A mocked UI test asks:

> How does our UI behave if the dependency returns X?

A real integration test asks:

> Does our system correctly interact with that dependency in this environment?

Both are useful. They are different tests.

## Decision table

| Scenario | Preferred approach |
| --- | --- |
| 400 validation behavior of API | API |
| UI displays 400 validation message | Browser, possibly controlled response |
| Create prerequisite customer | API/fixture |
| Prove signup flow works | Browser |
| Simulate rare third-party outage | Mocked browser test |
| Prove real payment sandbox integration | Real integration/E2E |
| Verify persisted status after UI action | Browser + API assertion if meaningful |
| Verify exact response schema | API |
| Verify ARIA role/name | Browser |

## Smell: browser as universal setup tool

If every test logs in, navigates through five menus, creates entities, and finally reaches the actual behavior under test, the suite may be spending most of its time testing prerequisites.

Move unrelated setup lower when safe.

## Smell: API-only because browser tests are hard

Do not replace important user-facing coverage merely because the UI test is flaky. Fix the architecture, state isolation, locators, or synchronization problem.

Lower-layer coverage cannot prove behavior it never exercises.

## Portfolio thinking

A strong suite often has overlapping but distinct coverage:

```text
Many API tests
  → broad business-rule and contract coverage

Focused browser tests
  → critical user journeys and browser behavior

Targeted mocked browser tests
  → deterministic edge/error states

A smaller set of real integration E2E tests
  → end-to-end connectivity across systems
```

The exact proportions depend on system risk and architecture.

## Review checklist

- What precise claim does this test make?
- Is browser behavior required to prove it?
- Is UI setup testing something irrelevant to that claim?
- If using API setup, what browser behavior is being skipped?
- If mocking, what real integration is no longer covered?
- Is an API assertion after UI proving persistence or merely duplicating the UI check?
- Is this test at the narrowest layer that still proves the requirement?

## Related field guides

- [API + Advanced Playwright](README.md)
- [Network & Browser Recipes](network-browser-recipes.md)
- [Reliable Test Design](../reliable-test-design/README.md)

---

**Verification note:** This decision guide is primarily Field Guide engineering guidance. Playwright API/browser capabilities referenced here were reviewed against official documentation on 2026-08-26.
