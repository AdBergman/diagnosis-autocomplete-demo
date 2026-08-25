import {
  fetchCataloguePage,
  type CatalogueRequest,
} from '../api/catalogue-api'

export interface VeterinaryClinic {
  name: string
  organisationNumber: string
}

export function fetchVeterinaryClinics(request: CatalogueRequest) {
  return fetchCataloguePage<VeterinaryClinic>(
    '/api/veterinary-clinics',
    'The veterinary clinic catalogue could not be loaded.',
    request,
  )
}
