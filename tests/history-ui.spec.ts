import { expect, test } from '@playwright/test';

test('history dashboard and modal render cleanly', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'My Ratings' })).toBeVisible();
  const historyPanelButton = page.getByRole('button', { name: 'Expand rating history dashboard' });
  await expect(historyPanelButton).toBeVisible();

  await historyPanelButton.click();
  await expect(page.getByText('Biggest Movers')).toBeVisible();
  await expect(page.getByText('Collection Activity')).toBeVisible();

  const historyButton = page.getByRole('button', { name: /Open rating history for/i }).first();
  await expect(historyButton).toBeVisible();
  await historyButton.click();

  await expect(page.locator('h2', { hasText: 'Rating History' })).toBeVisible();
  await expect(page.getByText('First', { exact: true })).toBeVisible();
  await expect(page.getByText('Latest', { exact: true })).toBeVisible();
  await expect(page.getByText('Entries', { exact: true })).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath('history-ui-full-page.png'),
    fullPage: true
  });

  await page.mouse.click(10, 10);
  await expect(page.locator('h2', { hasText: 'Rating History' })).toBeHidden();
});

test('history modal reflects current collection ratings when generated history is stale', async ({ page }) => {
  await page.route('**/history.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        sourcePath: 'public/constants.csv',
        pageSize: 100,
        commits: [
          {
            sha: 'stale-history',
            date: '2026-01-01T00:00:00.000Z',
            message: 'Stale history',
            label: 'Stale history',
            rawUrl: ''
          }
        ],
        fragrances: [
          {
            id: '58692',
            pid: '58692',
            brand: 'Xerjoff',
            name: 'Naxos',
            firstSeenAt: '2026-01-01T00:00:00.000Z',
            ratings: [
              {
                rating: 7,
                date: '2026-01-01T00:00:00.000Z',
                commit: 'stale-history',
                timeRated: 'Stale',
                commitDate: '2026-01-01T00:00:00.000Z'
              }
            ]
          }
        ]
      })
    });
  });

  await page.goto('/');

  await page.getByPlaceholder('Search your collection...').fill('Naxos');
  const historyButton = page.getByRole('button', { name: 'Open rating history for Xerjoff Naxos' });
  await expect(historyButton).toBeVisible();
  await historyButton.click();

  await expect(page.locator('h2', { hasText: 'Rating History' })).toBeVisible();
  await expect(page.getByTestId('history-latest-rating')).toHaveText('8.0');
  await expect(page.getByTestId('history-entry-local-current')).toContainText('8.0');
});

test('top modals close when clicking outside', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Field Fixer' }).click();
  await expect(page.getByRole('heading', { name: 'Field Fixer' })).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByRole('heading', { name: 'Field Fixer' })).toBeHidden();

  await page.getByRole('button', { name: /Import \/ Settings/i }).click();
  await expect(page.getByRole('heading', { name: 'Settings & Import' })).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByRole('heading', { name: 'Settings & Import' })).toBeHidden();
});
