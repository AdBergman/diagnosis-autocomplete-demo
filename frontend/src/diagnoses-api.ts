import {
  fetchCataloguePage,
  type CatalogueRequest,
} from './catalogue-api'

export interface Diagnosis {
  code: string
  description: string
}

export function fetchDiagnoses(request: CatalogueRequest) {
  return fetchCataloguePage<Diagnosis>(
    '/api/diagnoses',
    'The diagnosis catalogue could not be loaded.',
    request,
  )
}
