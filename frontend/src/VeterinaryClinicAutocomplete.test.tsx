import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VeterinaryClinicAutocomplete } from './VeterinaryClinicAutocomplete'
import type { VeterinaryClinic } from './veterinary-clinics-api'

const CLINICS: VeterinaryClinic[] = [
  { name: 'Åre Centrum Djurklinik', organisationNumber: '559100-0004' },
  { name: 'Malmö Park Djursjukhus', organisationNumber: '559100-1622' },
]

const fetchMock = vi.fn<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>()

describe('VeterinaryClinicAutocomplete', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('loads clinics from their endpoint and exposes organisation numbers', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse(CLINICS))

    render(<VeterinaryClinicAutocomplete />)

    expect(
      await screen.findByRole('option', { name: 'Åre Centrum Djurklinik' }),
    ).toHaveAccessibleDescription('559100-0004')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/veterinary-clinics?page=0&size=20',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})

function pageResponse(items: VeterinaryClinic[]) {
  return new Response(
    JSON.stringify({
      items,
      page: 0,
      size: 20,
      totalElements: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      hasNext: false,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
