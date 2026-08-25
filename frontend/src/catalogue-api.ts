export interface CataloguePage<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface CatalogueRequest {
  query: string
  page: number
  signal: AbortSignal
}

const PAGE_SIZE = 20

export async function fetchCataloguePage<T>(
  endpoint: string,
  errorMessage: string,
  { query, page, signal }: CatalogueRequest,
): Promise<CataloguePage<T>> {
  const parameters = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  })

  if (query) {
    parameters.set('q', query)
  }

  const response = await fetch(`${endpoint}?${parameters}`, { signal })

  if (!response.ok) {
    throw new Error(errorMessage)
  }

  return (await response.json()) as CataloguePage<T>
}
