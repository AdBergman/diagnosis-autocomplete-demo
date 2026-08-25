import {
  fetchCataloguePage,
  type CataloguePage,
  type CatalogueRequest,
} from '../api/catalogue-api'

export interface BffAutocompleteConfig {
  heading: string
  searchUrl: string
}

export interface BffAutocompleteItem {
  id: string
  label: string
  description: string
}

const ALLOWED_SEARCH_PATH = '/api/bff/autocompletes/'
const VALIDATION_ORIGIN = 'https://autocomplete.example'

export async function fetchBffConfig(
  configUrl: string,
  signal: AbortSignal,
): Promise<BffAutocompleteConfig> {
  const response = await fetch(configUrl, { signal })
  if (!response.ok) {
    throw new Error('The BFF autocomplete configuration could not be loaded.')
  }

  const value: unknown = await response.json()
  if (!isRecord(value) || !isNonBlankString(value.heading)) {
    throw new Error('The BFF autocomplete configuration is invalid.')
  }
  if (!isNonBlankString(value.searchUrl) || !isAllowedSearchUrl(value.searchUrl)) {
    throw new Error('The BFF autocomplete search URL is invalid.')
  }

  return {
    heading: value.heading,
    searchUrl: value.searchUrl,
  }
}

export async function fetchBffItems(
  searchUrl: string,
  request: CatalogueRequest,
) {
  if (!isAllowedSearchUrl(searchUrl)) {
    throw new Error('The BFF autocomplete search URL is invalid.')
  }

  const page: unknown = await fetchCataloguePage<unknown>(
    searchUrl,
    'The BFF autocomplete results could not be loaded.',
    request,
  )
  if (!isBffAutocompletePage(page)) {
    throw new Error('The BFF autocomplete results are invalid.')
  }
  return page
}

function isAllowedSearchUrl(value: string) {
  if (!value.startsWith(ALLOWED_SEARCH_PATH)) {
    return false
  }

  const base = new URL(VALIDATION_ORIGIN)
  const url = new URL(value, base)
  return (
    url.origin === base.origin &&
    url.pathname.startsWith(ALLOWED_SEARCH_PATH) &&
    url.search === '' &&
    url.hash === ''
  )
}

function isBffAutocompleteItem(value: unknown): value is BffAutocompleteItem {
  return (
    isRecord(value) &&
    isNonBlankString(value.id) &&
    isNonBlankString(value.label) &&
    typeof value.description === 'string'
  )
}

function isBffAutocompletePage(
  value: unknown,
): value is CataloguePage<BffAutocompleteItem> {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isBffAutocompleteItem) &&
    isNonNegativeInteger(value.page) &&
    isPositiveInteger(value.size) &&
    isNonNegativeInteger(value.totalElements) &&
    isNonNegativeInteger(value.totalPages) &&
    typeof value.hasNext === 'boolean'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0
}
