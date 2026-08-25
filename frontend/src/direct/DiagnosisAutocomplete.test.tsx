import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiagnosisAutocomplete } from './DiagnosisAutocomplete'
import type { Diagnosis } from './diagnoses-api'
import { triggerObservedIntersections } from '../test/setup'

const INITIAL_DIAGNOSES: Diagnosis[] = [
  { code: 'A00', description: 'Cholera' },
  { code: 'B20', description: 'Human immunodeficiency virus disease' },
]

const HEART_DIAGNOSIS: Diagnosis = {
  code: 'I51.9',
  description: 'Heart disease, unspecified',
}

const fetchMock = vi.fn<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>()

describe('DiagnosisAutocomplete', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('exposes an accessible search field and replaces the initial loading state with results', async () => {
    const request = deferred<Response>()
    fetchMock.mockReturnValueOnce(request.promise)

    render(<DiagnosisAutocomplete />)

    const search = screen.getByRole('searchbox', {
      name: 'Search diagnoses',
    })
    expect(search).toHaveAttribute('placeholder', 'Search diagnoses…')
    expect(search).toHaveAccessibleDescription(
      'Search by diagnosis code or description',
    )
    expect(
      screen.getByRole('listbox', { name: 'Diagnosis results' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Loading diagnoses…')).toBeInTheDocument()
    expectRequest(1, '/api/diagnoses?page=0&size=20')

    request.resolve(pageResponse(INITIAL_DIAGNOSES))

    expect(
      await screen.findByRole('option', { name: 'A00' }),
    ).toHaveAccessibleDescription('Cholera')
    expect(
      screen.getByRole('option', {
        name: 'B20',
      }),
    ).toHaveAccessibleDescription('Human immunodeficiency virus disease')
    expect(screen.queryByText('Loading diagnoses…')).not.toBeInTheDocument()
  })

  it('debounces searches, sends the trimmed query to page zero, and renders the matching result', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(pageResponse(INITIAL_DIAGNOSES))
      .mockResolvedValueOnce(pageResponse([HEART_DIAGNOSIS]))

    render(<DiagnosisAutocomplete />)
    await screen.findByRole('option', { name: 'A00' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Search diagnoses' }),
      'heart',
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByRole('option', {
        name: 'I51.9',
      }),
    ).toBeVisible()
    expectRequest(2, '/api/diagnoses?page=0&size=20&q=heart')
    expect(screen.queryByRole('option', { name: 'A00' })).not.toBeInTheDocument()
  })

  it('shows an empty state when the server returns no matches', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([]))

    render(<DiagnosisAutocomplete />)

    expect(await screen.findByText('No diagnoses found.')).toBeVisible()
    expect(
      screen.getByRole('option', { name: 'No diagnoses found.' }),
    ).toBeVisible()
    expect(screen.queryByRole('option', { name: 'A00' })).not.toBeInTheDocument()
  })

  it('reports a server error and reloads the list when retry is pressed', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(pageResponse(INITIAL_DIAGNOSES))

    render(<DiagnosisAutocomplete />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'The diagnosis catalogue could not be loaded.',
    )
    expect(screen.getByText('Results unavailable.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('option', { name: 'A00' })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expectRequest(2, '/api/diagnoses?page=0&size=20')
  })

  it('clears a query and restores the unfiltered first page', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(pageResponse(INITIAL_DIAGNOSES))
      .mockResolvedValueOnce(pageResponse([HEART_DIAGNOSIS]))
      .mockResolvedValueOnce(pageResponse(INITIAL_DIAGNOSES))

    render(<DiagnosisAutocomplete />)
    const search = screen.getByRole('searchbox', { name: 'Search diagnoses' })
    await screen.findByRole('option', { name: 'A00' })

    await user.type(search, 'heart')
    await screen.findByRole('option', {
      name: 'I51.9',
    })

    await user.click(
      screen.getByRole('button', { name: 'Clear diagnosis search' }),
    )

    expect(search).toHaveValue('')
    expect(await screen.findByRole('option', { name: 'A00' })).toBeVisible()
    expectRequest(3, '/api/diagnoses?page=0&size=20')
  })

  it('supports keyboard navigation and keeps a single confirmed selection', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(pageResponse(INITIAL_DIAGNOSES))

    render(<DiagnosisAutocomplete />)
    const search = screen.getByRole('searchbox', { name: 'Search diagnoses' })
    const firstOption = await screen.findByRole('option', { name: 'A00' })

    await user.click(search)
    await user.keyboard('{ArrowDown}{Enter}')

    expect(firstOption).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
    expect(
      screen.getByText(
        (_, element) =>
          element?.classList.contains('selection') === true &&
          element.textContent === 'Selected: A00 — Cholera',
      ),
    ).toBeVisible()
  })

  it('loads and appends the next page when the load-more sentinel intersects', async () => {
    const nextPage = deferred<Response>()
    fetchMock
      .mockResolvedValueOnce(
        pageResponse([INITIAL_DIAGNOSES[0]], { page: 0, hasNext: true }),
      )
      .mockReturnValueOnce(nextPage.promise)

    render(<DiagnosisAutocomplete />)
    await screen.findByRole('option', { name: 'A00' })

    act(() => triggerObservedIntersections())

    expect(await screen.findByText('Loading more diagnoses…')).toBeVisible()
    expectRequest(2, '/api/diagnoses?page=1&size=20')

    nextPage.resolve(
      pageResponse([INITIAL_DIAGNOSES[1]], { page: 1, hasNext: false }),
    )

    expect(
      await screen.findByRole('option', {
        name: 'B20',
      }),
    ).toBeVisible()
    expect(screen.getByRole('option', { name: 'A00' })).toBeVisible()
    await waitFor(() =>
      expect(
        screen.queryByText('Loading more diagnoses…'),
      ).not.toBeInTheDocument(),
    )
  })
})

function pageResponse(
  items: Diagnosis[],
  options: { page?: number; hasNext?: boolean } = {},
) {
  const page = options.page ?? 0
  const hasNext = options.hasNext ?? false

  return new Response(
    JSON.stringify({
      items,
      page,
      size: 20,
      totalElements: hasNext ? items.length + 1 : items.length,
      totalPages: hasNext ? page + 2 : page + 1,
      hasNext,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

function expectRequest(callNumber: number, url: string) {
  expect(fetchMock).toHaveBeenNthCalledWith(
    callNumber,
    url,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  )
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, reject, resolve }
}
