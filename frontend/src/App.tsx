import './App.css'
import { DiagnosisAutocomplete } from './DiagnosisAutocomplete'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Spring Boot + React Aria</p>
        <h1>Diagnosis autocomplete</h1>
        <p className="intro">
          Browse or search 12,000 synthetic human and veterinary diagnoses.
          Results are ranked and paged by the server.
        </p>
      </header>

      <DiagnosisAutocomplete />

      <footer className="disclaimer">
        Synthetic demonstration data. Not for clinical or veterinary use.
      </footer>
    </main>
  )
}

export default App
