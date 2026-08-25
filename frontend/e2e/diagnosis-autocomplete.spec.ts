import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('uses one accessible autocomplete for diagnoses and veterinary clinics', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Server-backed autocomplete' }),
  ).toBeVisible()

  const diagnosisCard = page.getByRole('region', { name: 'Find a diagnosis' })
  const diagnosisSearch = diagnosisCard.getByRole('searchbox', {
    name: 'Search diagnoses',
  })
  const diagnosisResults = diagnosisCard.getByRole('listbox', {
    name: 'Diagnosis results',
  })
  const diagnosisOptions = diagnosisResults.getByRole('option')

  await expect(diagnosisOptions).toHaveCount(20)

  await diagnosisSearch.fill('renal')
  await expect(diagnosisOptions.first()).toContainText(/renal/i)

  await diagnosisSearch.press('ArrowDown')
  await diagnosisSearch.press('Enter')
  await expect(diagnosisCard.locator('.selection')).toContainText(
    /Selected:.*renal/i,
  )

  const firstPageSize = await diagnosisOptions.count()
  await diagnosisCard
    .getByRole('region', { name: 'Scrollable diagnosis results' })
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
  await expect.poll(() => diagnosisOptions.count()).toBeGreaterThan(firstPageSize)

  const clinicCard = page.getByRole('region', {
    name: 'Find a veterinary clinic',
  })
  const clinicSearch = clinicCard.getByRole('searchbox', {
    name: 'Search veterinary clinics',
  })
  const clinicOptions = clinicCard
    .getByRole('listbox', { name: 'Veterinary clinic results' })
    .getByRole('option')

  await expect(clinicOptions).toHaveCount(20)
  await clinicSearch.fill('malmo park')
  await expect(clinicOptions.first()).toContainText(/Malmö Park/i)

  await clinicSearch.fill('5591001622')
  await expect(clinicOptions).toHaveCount(1)
  await expect(clinicOptions.first()).toContainText('559100-1622')
  await clinicSearch.press('ArrowDown')
  await clinicSearch.press('Enter')
  await expect(clinicCard.locator('.selection')).toContainText(
    'Selected: Malmö Park Djursjukhus — 559100-1622',
  )

  const accessibilityScan = await new AxeBuilder({ page }).analyze()
  expect(accessibilityScan.violations).toEqual([])
})
