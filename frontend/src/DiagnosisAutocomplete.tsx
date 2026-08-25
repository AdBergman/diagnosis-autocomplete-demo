import { useRef, useState } from 'react'
import { Autocomplete } from 'react-aria-components/Autocomplete'
import {
  Collection,
  ListBox,
  ListBoxItem,
  ListBoxLoadMoreItem,
  Text,
  type Selection,
} from 'react-aria-components/ListBox'
import {
  Button,
  Input,
  Label,
  SearchField,
} from 'react-aria-components/SearchField'
import { useAsyncList } from 'react-aria-components/useAsyncList'
import { fetchDiagnoses, type Diagnosis } from './diagnoses-api'

const SEARCH_DEBOUNCE_MS = 250

export function DiagnosisAutocomplete() {
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<Diagnosis | null>(null)
  const hasStartedInitialLoad = useRef(false)

  const diagnoses = useAsyncList<Diagnosis, number>({
    getKey: (diagnosis) => diagnosis.code,
    async load({ signal, cursor, filterText }) {
      const shouldDebounce = hasStartedInitialLoad.current && cursor === undefined
      hasStartedInitialLoad.current = true

      if (shouldDebounce) {
        await waitForSearchPause(signal)
      }

      const page = await fetchDiagnoses({
        query: filterText?.trim() ?? '',
        page: cursor ?? 0,
        signal,
      })

      return {
        items: page.items,
        cursor: page.hasNext ? page.page + 1 : undefined,
      }
    },
  })

  const handleSelectionChange = (selection: Selection) => {
    diagnoses.setSelectedKeys(selection)

    if (selection === 'all') {
      return
    }

    const selectedCode = selection.values().next().value
    setSelectedDiagnosis(
      selectedCode === undefined
        ? null
        : (diagnoses.items.find(
            (diagnosis) => diagnosis.code === selectedCode,
          ) ?? null),
    )
  }

  const isInitialLoading = diagnoses.loadingState === 'loading'
  const isFiltering = diagnoses.loadingState === 'filtering'
  const isLoadingMore = diagnoses.loadingState === 'loadingMore'
  const hasLoadError =
    diagnoses.loadingState === 'error' && diagnoses.error !== undefined

  return (
    <section className="autocomplete-card" aria-labelledby="catalogue-heading">
      <div className="card-heading">
        <div>
          <h2 id="catalogue-heading">Find a diagnosis</h2>
          <p>Search across diagnosis codes and descriptions.</p>
        </div>
        <span className="server-badge">Server-backed</span>
      </div>

      <Autocomplete
        inputValue={diagnoses.filterText}
        onInputChange={diagnoses.setFilterText}
      >
        <SearchField className="diagnosis-search">
          <Label>Search diagnoses</Label>
          <Text slot="description">
            Search by diagnosis code or description
          </Text>
          <div className="search-control">
            <Input placeholder="Search diagnoses…" autoComplete="off" />
            <Button slot="clear" aria-label="Clear search">
              Clear
            </Button>
          </div>
        </SearchField>

        <div
          className="results-scroll"
          role="region"
          aria-label="Scrollable diagnosis results"
          tabIndex={0}
        >
          <ListBox
            aria-label="Diagnosis results"
            className="diagnosis-results"
            selectionMode="single"
            selectedKeys={diagnoses.selectedKeys}
            onSelectionChange={handleSelectionChange}
            renderEmptyState={() => (
              <div className="empty-state">
                {isInitialLoading || isFiltering
                  ? 'Loading diagnoses…'
                  : hasLoadError
                    ? 'Results unavailable.'
                    : 'No diagnoses found.'}
              </div>
            )}
          >
            <Collection items={diagnoses.items}>
              {(diagnosis) => (
                <ListBoxItem
                  id={diagnosis.code}
                  textValue={`${diagnosis.code} ${diagnosis.description}`}
                >
                  <Text slot="label">{diagnosis.code}</Text>
                  <Text slot="description">{diagnosis.description}</Text>
                </ListBoxItem>
              )}
            </Collection>
            <ListBoxLoadMoreItem
              onLoadMore={diagnoses.loadMore}
              isLoading={isLoadingMore}
            >
              <span className="load-more-status">Loading more diagnoses…</span>
            </ListBoxLoadMoreItem>
          </ListBox>
        </div>
      </Autocomplete>

      {(isInitialLoading || isFiltering) && diagnoses.items.length > 0 && (
        <p className="catalogue-status" role="status" aria-live="polite">
          Updating results…
        </p>
      )}

      {hasLoadError && (
        <div className="error-state" role="alert">
          <span>{diagnoses.error?.message}</span>
          <Button onPress={diagnoses.reload}>Try again</Button>
        </div>
      )}

      <p className="selection" aria-live="polite">
        {selectedDiagnosis ? (
          <>
            <span>Selected:</span> {selectedDiagnosis.code} —{' '}
            {selectedDiagnosis.description}
          </>
        ) : (
          'No diagnosis selected.'
        )}
      </p>
    </section>
  )
}

function waitForSearchPause(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeout)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, SEARCH_DEBOUNCE_MS)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}
