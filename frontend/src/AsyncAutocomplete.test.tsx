import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Text } from 'react-aria-components/ListBox'
import { describe, expect, it, vi } from 'vitest'
import { AsyncAutocomplete, type AsyncAutocompleteMessages } from './AsyncAutocomplete'
import { triggerObservedIntersections } from './test/setup'

interface Product {
  id: string
  title: string
  detail: string
}

const PRODUCTS: Product[] = [
  { id: 'one', title: 'First product', detail: 'Primary detail' },
  { id: 'two', title: 'Second product', detail: 'Secondary detail' },
]

const MESSAGES: AsyncAutocompleteMessages = {
  initialLoading: 'Loading products…',
  filtering: 'Updating products…',
  loadingMore: 'Loading more products…',
  empty: 'No products found.',
  unavailable: 'Products unavailable.',
  retry: 'Retry products',
  clear: 'Clear product search',
}

describe('AsyncAutocomplete', () => {
  it('loads and renders an arbitrary item shape and emits the selected item', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn<(item: Product | null) => void>()
    const load = vi.fn().mockResolvedValue({ items: PRODUCTS })

    renderProductAutocomplete({ load, onSelectionChange })

    const first = await screen.findByRole('option', { name: 'First product' })
    expect(first).toHaveAccessibleDescription('Primary detail')
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: undefined,
        filterText: '',
        signal: expect.any(AbortSignal),
      }),
    )

    const search = screen.getByRole('searchbox', { name: 'Search products' })
    await user.click(search)
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSelectionChange).toHaveBeenLastCalledWith(PRODUCTS[0])
    expect(first).toHaveAttribute('aria-selected', 'true')

    await user.type(search, 'next')
    expect(onSelectionChange).toHaveBeenLastCalledWith(null)
  })

  it('supports controlled selection', async () => {
    const load = vi.fn().mockResolvedValue({ items: PRODUCTS })

    renderProductAutocomplete({ load, selectedKey: 'two' })

    expect(
      await screen.findByRole('option', { name: 'Second product' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('passes through a generic cursor when loading another page', async () => {
    const load = vi.fn().mockImplementation(({ cursor }: { cursor?: string }) =>
      Promise.resolve(
        cursor === 'next-page'
          ? { items: [PRODUCTS[1]] }
          : { items: [PRODUCTS[0]], cursor: 'next-page' },
      ),
    )

    renderProductAutocomplete({ load })
    await screen.findByRole('option', { name: 'First product' })

    act(() => triggerObservedIntersections())

    await waitFor(() =>
      expect(load).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: 'next-page' }),
      ),
    )
    expect(
      await screen.findByRole('option', { name: 'Second product' }),
    ).toBeVisible()
  })
})

function renderProductAutocomplete({
  load,
  selectedKey,
  onSelectionChange,
}: {
  load: (options: {
    signal: AbortSignal
    cursor: string | undefined
    filterText: string
  }) => Promise<{ items: Product[]; cursor?: string }>
  selectedKey?: string
  onSelectionChange?: (item: Product | null) => void
}) {
  return render(
    <AsyncAutocomplete<Product, string>
      load={load}
      getKey={(product) => product.id}
      getTextValue={(product) => `${product.title} ${product.detail}`}
      renderItem={(product) => (
        <>
          <Text slot="label">{product.title}</Text>
          <Text slot="description">{product.detail}</Text>
        </>
      )}
      label="Search products"
      description="Search the product catalogue"
      placeholder="Search products…"
      resultsLabel="Product results"
      scrollRegionLabel="Scrollable product results"
      messages={MESSAGES}
      debounceMs={0}
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
    />,
  )
}
