export interface Diagnosis {
  code: string
  description: string
}

interface DiagnosisPage {
  items: Diagnosis[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

interface DiagnosisRequest {
  query: string
  page: number
  signal: AbortSignal
}

const PAGE_SIZE = 20

export async function fetchDiagnoses({
  query,
  page,
  signal,
}: DiagnosisRequest): Promise<DiagnosisPage> {
  const parameters = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  })

  if (query) {
    parameters.set('q', query)
  }

  const response = await fetch(`/api/diagnoses?${parameters}`, { signal })

  if (!response.ok) {
    throw new Error('The diagnosis catalogue could not be loaded.')
  }

  return (await response.json()) as DiagnosisPage
}
