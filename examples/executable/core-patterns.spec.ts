import { expect, test } from '@playwright/test';

test('role locator and web-first assertion', async ({ page }) => {
  await page.setContent(`
    <main>
      <button
        type="button"
        onclick="document.querySelector('[role=status]').textContent='Saved'"
      >
        Save changes
      </button>
      <p role="status"></p>
    </main>
  `);

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
});

test('semantic scoping beats positional selection', async ({ page }) => {
  await page.setContent(`
    <ul>
      <li><span>Basic plan</span><button>Choose</button></li>
      <li><span>Enterprise plan</span><button>Choose</button></li>
    </ul>
  `);

  const enterprise = page
    .getByRole('listitem')
    .filter({ hasText: 'Enterprise plan' });

  await expect(enterprise.getByRole('button', { name: 'Choose' })).toBeVisible();
});

test('labeled controls express form intent', async ({ page }) => {
  await page.setContent(`
    <label>Email address <input type="email" /></label>
  `);

  const email = page.getByLabel('Email address');
  await email.fill('qa@example.com');
  await expect(email).toHaveValue('qa@example.com');
});
