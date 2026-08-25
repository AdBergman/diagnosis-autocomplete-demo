import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('searches, selects, and loads another server page accessibly', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Diagnosis autocomplete' }),
  ).toBeVisible()

  const search = page.getByRole('searchbox', { name: 'Search diagnoses' })
  const results = page.getByRole('listbox', { name: 'Diagnosis results' })
  const options = results.getByRole('option')

  await expect(options).toHaveCount(20)

  await search.fill('renal')
  await expect(options.first()).toContainText(/renal/i)

  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page.locator('.selection')).toContainText(/Selected:.*renal/i)

  const firstPageSize = await options.count()
  await page
    .getByRole('region', { name: 'Scrollable diagnosis results' })
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
  await expect.poll(() => options.count()).toBeGreaterThan(firstPageSize)

  const accessibilityScan = await new AxeBuilder({ page }).analyze()
  expect(accessibilityScan.violations).toEqual([])
})
