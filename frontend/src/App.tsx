import './App.css'
import { BffAutocomplete } from './bff/BffAutocomplete'
import { DiagnosisAutocomplete } from './direct/DiagnosisAutocomplete'
import { VeterinaryClinicAutocomplete } from './direct/VeterinaryClinicAutocomplete'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Spring Boot + React Aria</p>
        <h1>Autocomplete, with and without a BFF</h1>
        <p className="intro">
          Three adapters share one typed autocomplete. The direct examples know
          their domain APIs; the BFF example receives its heading, URL, and
          display-ready items from Spring Boot.
        </p>
      </header>

      <section className="demo-section" aria-labelledby="direct-heading">
        <div className="section-heading">
          <p className="eyebrow">Without BFF</p>
          <h2 id="direct-heading">Direct domain APIs</h2>
          <p>The frontend maps each domain response into the shared component.</p>
        </div>
        <div className="catalogue-grid">
          <DiagnosisAutocomplete />
          <VeterinaryClinicAutocomplete />
        </div>
      </section>

      <section className="demo-section" aria-labelledby="bff-heading">
        <div className="section-heading">
          <p className="eyebrow">With BFF</p>
          <h2 id="bff-heading">Server-configured presentation</h2>
          <p>The frontend consumes one canonical item shape.</p>
        </div>
        <BffAutocomplete configUrl="/api/bff/autocompletes/veterinary-clinics" />
      </section>

      <footer className="disclaimer">
        Synthetic demonstration data. Not for clinical or veterinary use.
      </footer>
    </main>
  )
}

export default App
