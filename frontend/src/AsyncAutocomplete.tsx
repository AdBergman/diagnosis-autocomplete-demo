import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Autocomplete } from 'react-aria-components/Autocomplete'
import {
  Collection,
  ListBox,
  ListBoxItem,
  ListBoxLoadMoreItem,
  type Key,
  type Selection,
} from 'react-aria-components/ListBox'
import {
  Button,
  Input,
  Label,
  SearchField,
  Text,
} from 'react-aria-components/SearchField'
import { useAsyncList } from 'react-aria-components/useAsyncList'
import './AsyncAutocomplete.css'

const DEFAULT_DEBOUNCE_MS = 250

export interface AsyncAutocompleteLoadOptions<Cursor> {
  signal: AbortSignal
  cursor: Cursor | undefined
  filterText: string
}

export interface AsyncAutocompleteLoadResult<T, Cursor> {
  items: T[]
  cursor?: Cursor
}

export interface AsyncAutocompleteMessages {
  initialLoading: string
  filtering: string
  loadingMore: string
  empty: string
  unavailable: string
  retry: string
  clear: string
}

export interface AsyncAutocompleteProps<T extends object, Cursor> {
  load: (
    options: AsyncAutocompleteLoadOptions<Cursor>,
  ) => Promise<AsyncAutocompleteLoadResult<T, Cursor>>
  getKey: (item: T) => Key
  getTextValue: (item: T) => string
  renderItem: (item: T) => ReactNode
  label: string
  description: string
  placeholder: string
  resultsLabel: string
  scrollRegionLabel: string
  messages: AsyncAutocompleteMessages
  debounceMs?: number
  selectedKey?: Key | null
  defaultSelectedKey?: Key | null
  clearSelectionOnInputChange?: boolean
  onSelectionChange?: (item: T | null) => void
}

export function AsyncAutocomplete<T extends object, Cursor>({
  load,
  getKey,
  getTextValue,
  renderItem,
  label,
  description,
  placeholder,
  resultsLabel,
  scrollRegionLabel,
  messages,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  selectedKey,
  defaultSelectedKey = null,
  clearSelectionOnInputChange = true,
  onSelectionChange,
}: AsyncAutocompleteProps<T, Cursor>) {
  const [uncontrolledSelectedKey, setUncontrolledSelectedKey] =
    useState<Key | null>(defaultSelectedKey)
  const hasStartedInitialLoad = useRef(false)
  const effectiveSelectedKey =
    selectedKey === undefined ? uncontrolledSelectedKey : selectedKey
  const selectedKeys = useMemo(
    () =>
      effectiveSelectedKey === null
        ? new Set<Key>()
        : new Set<Key>([effectiveSelectedKey]),
    [effectiveSelectedKey],
  )

  const list = useAsyncList<T, Cursor>({
    getKey,
    async load({ signal, cursor, filterText }) {
      const shouldDebounce = hasStartedInitialLoad.current && cursor === undefined
      hasStartedInitialLoad.current = true

      if (shouldDebounce) {
        await waitForSearchPause(signal, debounceMs)
      }

      return load({
        signal,
        cursor,
        filterText: filterText?.trim() ?? '',
      })
    },
  })

  const updateSelectedKey = (key: Key | null, item: T | null) => {
    if (selectedKey === undefined) {
      setUncontrolledSelectedKey(key)
    }
    onSelectionChange?.(item)
  }

  const handleSelectionChange = (selection: Selection) => {
    if (selection === 'all') {
      return
    }

    const key = selection.values().next().value ?? null
    const item =
      key === null
        ? null
        : (list.items.find((entry) => getKey(entry) === key) ?? null)
    updateSelectedKey(key, item)
  }

  const handleInputChange = (value: string) => {
    list.setFilterText(value)
    if (clearSelectionOnInputChange && effectiveSelectedKey !== null) {
      updateSelectedKey(null, null)
    }
  }

  const isInitialLoading = list.loadingState === 'loading'
  const isFiltering = list.loadingState === 'filtering'
  const isLoadingMore = list.loadingState === 'loadingMore'
  const hasLoadError = list.loadingState === 'error' && list.error !== undefined

  return (
    <div className="async-autocomplete">
      <Autocomplete inputValue={list.filterText} onInputChange={handleInputChange}>
        <SearchField className="async-autocomplete__search">
          <Label>{label}</Label>
          <Text slot="description">{description}</Text>
          <div className="async-autocomplete__control">
            <Input placeholder={placeholder} autoComplete="off" />
            <Button slot="clear" aria-label={messages.clear}>
              {messages.clear}
            </Button>
          </div>
        </SearchField>

        <div
          className="async-autocomplete__scroll"
          role="region"
          aria-label={scrollRegionLabel}
          tabIndex={0}
        >
          <ListBox
            aria-label={resultsLabel}
            className="async-autocomplete__results"
            selectionMode="single"
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            renderEmptyState={() => (
              <div className="async-autocomplete__empty">
                {isInitialLoading
                  ? messages.initialLoading
                  : isFiltering
                    ? messages.filtering
                    : hasLoadError
                      ? messages.unavailable
                      : messages.empty}
              </div>
            )}
          >
            <Collection items={list.items}>
              {(item) => (
                <ListBoxItem id={getKey(item)} textValue={getTextValue(item)}>
                  {renderItem(item)}
                </ListBoxItem>
              )}
            </Collection>
            <ListBoxLoadMoreItem
              onLoadMore={list.loadMore}
              isLoading={isLoadingMore}
            >
              <span className="async-autocomplete__load-more">
                {messages.loadingMore}
              </span>
            </ListBoxLoadMoreItem>
          </ListBox>
        </div>
      </Autocomplete>

      {isFiltering && list.items.length > 0 && (
        <p className="async-autocomplete__status" role="status" aria-live="polite">
          {messages.filtering}
        </p>
      )}

      {hasLoadError && (
        <div className="async-autocomplete__error" role="alert">
          <span>{list.error?.message}</span>
          <Button onPress={list.reload}>{messages.retry}</Button>
        </div>
      )}
    </div>
  )
}

function waitForSearchPause(
  signal: AbortSignal,
  debounceMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeout)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, debounceMs)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}
