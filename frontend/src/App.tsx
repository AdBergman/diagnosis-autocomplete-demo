import './App.css'
import { DiagnosisAutocomplete } from './DiagnosisAutocomplete'
import { VeterinaryClinicAutocomplete } from './VeterinaryClinicAutocomplete'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">One component, two catalogues</p>
        <h1>Server-backed autocomplete</h1>
        <p className="intro">
          The same lightweight React Aria component searches diagnoses and
          veterinary clinics through independently ranked, paged APIs.
        </p>
      </header>

      <div className="catalogue-grid">
        <DiagnosisAutocomplete />
        <VeterinaryClinicAutocomplete />
      </div>

      <footer className="disclaimer">
        Synthetic demonstration data. Not for clinical or veterinary use.
      </footer>
    </main>
  )
}

export default App
