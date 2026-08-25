import { useEffect, useId, useState } from 'react'
import { Button, Text } from 'react-aria-components'
import {
  AsyncAutocomplete,
  type AsyncAutocompleteLoadOptions,
} from '../components/AsyncAutocomplete'
import {
  fetchBffConfig,
  fetchBffItems,
  type BffAutocompleteConfig,
  type BffAutocompleteItem,
} from './bff-api'

interface BffAutocompleteProps {
  configUrl: string
}

type ConfigurationState =
  | { status: 'loading' }
  | { status: 'ready'; config: BffAutocompleteConfig }
  | { status: 'error'; message: string }

const MESSAGES = {
  initialLoading: 'Loading results…',
  filtering: 'Updating results…',
  loadingMore: 'Loading more results…',
  empty: 'No results found.',
  unavailable: 'Results unavailable.',
  retry: 'Try again',
  clear: 'Clear search',
}

export function BffAutocomplete({ configUrl }: BffAutocompleteProps) {
  return <BffAutocompleteRequest key={configUrl} configUrl={configUrl} />
}

function BffAutocompleteRequest({ configUrl }: BffAutocompleteProps) {
  const [state, setState] = useState<ConfigurationState>({ status: 'loading' })
  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchBffConfig(configUrl, controller.signal).then(
      (config) => setState({ status: 'ready', config }),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message:
              reason instanceof Error ? reason.message : 'Configuration failed.',
          })
        }
      },
    )

    return () => controller.abort()
  }, [configUrl, requestNumber])

  if (state.status === 'error') {
    return (
      <section className="autocomplete-card bff-card" aria-label="BFF autocomplete">
        <div className="bff-config-state" role="alert">
          <span>{state.message}</span>
          <Button
            onPress={() => {
              setState({ status: 'loading' })
              setRequestNumber((value) => value + 1)
            }}
          >
            Try again
          </Button>
        </div>
      </section>
    )
  }

  if (state.status === 'loading') {
    return (
      <section className="autocomplete-card bff-card" aria-label="BFF autocomplete">
        <p className="bff-config-state" role="status">
          Loading BFF configuration…
        </p>
      </section>
    )
  }

  return (
    <ConfiguredBffAutocomplete
      key={state.config.searchUrl}
      config={state.config}
    />
  )
}

function ConfiguredBffAutocomplete({
  config,
}: {
  config: BffAutocompleteConfig
}) {
  const headingId = useId()
  const [selectedItem, setSelectedItem] = useState<BffAutocompleteItem | null>(null)

  const load = async ({
    filterText,
    cursor,
    signal,
  }: AsyncAutocompleteLoadOptions<number>) => {
    const page = await fetchBffItems(config.searchUrl, {
      query: filterText,
      page: cursor ?? 0,
      signal,
    })
    return {
      items: page.items,
      cursor: page.hasNext ? page.page + 1 : undefined,
    }
  }

  return (
    <section className="autocomplete-card bff-card" aria-labelledby={headingId}>
      <div className="card-heading">
        <div>
          <h3 id={headingId}>{config.heading}</h3>
          <p>Configuration and display-ready results come from the BFF.</p>
        </div>
        <span className="server-badge">BFF configured</span>
      </div>

      <AsyncAutocomplete<BffAutocompleteItem, number>
        load={load}
        getKey={(item) => item.id}
        getTextValue={(item) => `${item.label} ${item.description}`}
        renderItem={(item) => (
          <>
            <Text slot="label">{item.label}</Text>
            <Text slot="description">{item.description}</Text>
          </>
        )}
        label={`${config.heading}: search`}
        description="Search the server-configured catalogue"
        placeholder="Search…"
        resultsLabel="BFF autocomplete results"
        scrollRegionLabel="Scrollable BFF autocomplete results"
        messages={MESSAGES}
        onSelectionChange={setSelectedItem}
      />

      <p className="selection" aria-live="polite">
        {selectedItem ? (
          <>
            <span>Selected:</span> {selectedItem.label} — {selectedItem.description}
          </>
        ) : (
          'No item selected.'
        )}
      </p>
    </section>
  )
}
