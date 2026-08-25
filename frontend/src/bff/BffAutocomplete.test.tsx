import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BffAutocomplete } from './BffAutocomplete'

const CONFIG_URL = '/api/bff/autocompletes/veterinary-clinics'
const SEARCH_URL = '/api/bff/autocompletes/veterinary-clinics/items'

const fetchMock = vi.fn<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>()

describe('BffAutocomplete', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('uses the server heading and canonical search URL', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          heading: 'Choose a clinic from server configuration',
          searchUrl: SEARCH_URL,
        }),
      )
      .mockResolvedValueOnce(
        pageResponse([
          {
            id: '559100-1622',
            label: 'Malmö Park Djursjukhus',
            description: '559100-1622',
          },
        ]),
      )

    render(<BffAutocomplete configUrl={CONFIG_URL} />)

    expect(
      await screen.findByRole('heading', {
        name: 'Choose a clinic from server configuration',
      }),
    ).toBeVisible()
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      CONFIG_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    const option = await screen.findByRole('option', {
      name: 'Malmö Park Djursjukhus',
    })
    expect(option).toHaveAccessibleDescription('559100-1622')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${SEARCH_URL}?page=0&size=20`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    const search = screen.getByRole('searchbox', {
      name: 'Choose a clinic from server configuration: search',
    })
    await user.click(search)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByText(/No item selected/)).not.toBeInTheDocument()
  })

  it.each([
    'https://outside.example/items',
    '//outside.example/items',
    '/api/diagnoses',
  ])('rejects an unsafe configured search URL: %s', async (searchUrl) => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ heading: 'Unsafe configuration', searchUrl }),
    )

    render(<BffAutocomplete configUrl={CONFIG_URL} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The BFF autocomplete search URL is invalid.',
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it.each([
    {},
    { items: {} },
    {
      items: [],
      page: '0',
      size: 20,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
    },
    {
      items: [{ id: '', label: 'Invalid', description: '' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    },
  ])('rejects a malformed BFF result page', async (resultPage) => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ heading: 'Configured search', searchUrl: SEARCH_URL }),
      )
      .mockResolvedValueOnce(jsonResponse(resultPage))

    render(<BffAutocomplete configUrl={CONFIG_URL} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The BFF autocomplete results are invalid.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('starts clean when the configuration URL changes', async () => {
    const failedConfigUrl = `${CONFIG_URL}/unavailable`
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse({
          heading: 'Recovered configuration',
          searchUrl: SEARCH_URL,
        }),
      )
      .mockResolvedValueOnce(
        pageResponse([
          {
            id: '559100-1622',
            label: 'Malmö Park Djursjukhus',
            description: '559100-1622',
          },
        ]),
      )

    const { rerender } = render(
      <BffAutocomplete configUrl={failedConfigUrl} />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The BFF autocomplete configuration could not be loaded.',
    )

    rerender(<BffAutocomplete configUrl={CONFIG_URL} />)

    expect(
      await screen.findByRole('heading', { name: 'Recovered configuration' }),
    ).toBeVisible()
    expect(
      await screen.findByRole('option', { name: 'Malmö Park Djursjukhus' }),
    ).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function pageResponse(items: unknown[]) {
  return jsonResponse({
    items,
    page: 0,
    size: 20,
    totalElements: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
  })
}
