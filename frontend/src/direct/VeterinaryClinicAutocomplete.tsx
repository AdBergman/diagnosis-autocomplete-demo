import { useId, useState } from 'react'
import { Text } from 'react-aria-components'
import {
  AsyncAutocomplete,
  type AsyncAutocompleteLoadOptions,
} from '../components/AsyncAutocomplete'
import {
  fetchVeterinaryClinics,
  type VeterinaryClinic,
} from './veterinary-clinics-api'

const MESSAGES = {
  initialLoading: 'Loading veterinary clinics…',
  filtering: 'Updating veterinary clinic results…',
  loadingMore: 'Loading more veterinary clinics…',
  empty: 'No veterinary clinics found.',
  unavailable: 'Results unavailable.',
  retry: 'Try again',
  clear: 'Clear veterinary clinic search',
}

export function VeterinaryClinicAutocomplete() {
  const headingId = useId()
  const [selectedClinic, setSelectedClinic] = useState<VeterinaryClinic | null>(null)

  return (
    <section className="autocomplete-card" aria-labelledby={headingId}>
      <div className="card-heading">
        <div>
          <h3 id={headingId}>Find a veterinary clinic</h3>
          <p>Search by clinic name or Swedish organisation number.</p>
        </div>
        <span className="server-badge">1,000 records</span>
      </div>

      <AsyncAutocomplete<VeterinaryClinic, number>
        load={loadVeterinaryClinics}
        getKey={(clinic) => clinic.organisationNumber}
        getTextValue={(clinic) => `${clinic.name} ${clinic.organisationNumber}`}
        renderItem={(clinic) => (
          <>
            <Text slot="label">{clinic.name}</Text>
            <Text slot="description">{clinic.organisationNumber}</Text>
          </>
        )}
        label="Search veterinary clinics"
        description="Search by clinic name or organisation number"
        placeholder="Search veterinary clinics…"
        resultsLabel="Veterinary clinic results"
        scrollRegionLabel="Scrollable veterinary clinic results"
        messages={MESSAGES}
        onSelectionChange={setSelectedClinic}
      />

      <p className="selection" aria-live="polite">
        {selectedClinic ? (
          <>
            <span>Selected:</span> {selectedClinic.name} —{' '}
            {selectedClinic.organisationNumber}
          </>
        ) : (
          'No veterinary clinic selected.'
        )}
      </p>
    </section>
  )
}

async function loadVeterinaryClinics({
  filterText,
  cursor,
  signal,
}: AsyncAutocompleteLoadOptions<number>) {
  const page = await fetchVeterinaryClinics({
    query: filterText,
    page: cursor ?? 0,
    signal,
  })

  return {
    items: page.items,
    cursor: page.hasNext ? page.page + 1 : undefined,
  }
}
