import { useId, useState } from 'react'
import { Text } from 'react-aria-components/ListBox'
import {
  AsyncAutocomplete,
  type AsyncAutocompleteLoadOptions,
} from './AsyncAutocomplete'
import { fetchDiagnoses, type Diagnosis } from './diagnoses-api'

const MESSAGES = {
  initialLoading: 'Loading diagnoses…',
  filtering: 'Updating diagnosis results…',
  loadingMore: 'Loading more diagnoses…',
  empty: 'No diagnoses found.',
  unavailable: 'Results unavailable.',
  retry: 'Try again',
  clear: 'Clear diagnosis search',
}

export function DiagnosisAutocomplete() {
  const headingId = useId()
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null)

  return (
    <section className="autocomplete-card" aria-labelledby={headingId}>
      <div className="card-heading">
        <div>
          <h2 id={headingId}>Find a diagnosis</h2>
          <p>Search across diagnosis codes and descriptions.</p>
        </div>
        <span className="server-badge">12,000 records</span>
      </div>

      <AsyncAutocomplete<Diagnosis, number>
        load={loadDiagnoses}
        getKey={(diagnosis) => diagnosis.code}
        getTextValue={(diagnosis) =>
          `${diagnosis.code} ${diagnosis.description}`
        }
        renderItem={(diagnosis) => (
          <>
            <Text slot="label">{diagnosis.code}</Text>
            <Text slot="description">{diagnosis.description}</Text>
          </>
        )}
        label="Search diagnoses"
        description="Search by diagnosis code or description"
        placeholder="Search diagnoses…"
        resultsLabel="Diagnosis results"
        scrollRegionLabel="Scrollable diagnosis results"
        messages={MESSAGES}
        onSelectionChange={setSelectedDiagnosis}
      />

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

async function loadDiagnoses({
  filterText,
  cursor,
  signal,
}: AsyncAutocompleteLoadOptions<number>) {
  const page = await fetchDiagnoses({
    query: filterText,
    page: cursor ?? 0,
    signal,
  })

  return {
    items: page.items,
    cursor: page.hasNext ? page.page + 1 : undefined,
  }
}
