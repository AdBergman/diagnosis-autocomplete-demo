import { writeFileSync } from 'node:fs'

const places = [
  'Åre', 'Malmö', 'Göteborg', 'Uppsala', 'Stockholm',
  'Kiruna', 'Visby', 'Lund', 'Örebro', 'Västerås',
]
const districts = [
  'Centrum', 'Norra', 'Södra', 'Östra', 'Västra',
  'Strand', 'Park', 'City', 'Dal', 'Höjd',
]
const practices = [
  'Djurklinik', 'Veterinärklinik', 'Djursjukhus', 'Djurvård',
  'Veterinärmottagning', 'Djurcenter', 'Veterinärcenter',
  'Smådjursklinik', 'Hästklinik', 'Djurhälsa',
]

function luhnCheckDigit(nineDigits) {
  const sum = [...nineDigits].reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 0 ? 2 : 1)
    return total + (value > 9 ? value - 9 : value)
  }, 0)
  return String((10 - (sum % 10)) % 10)
}

const clinics = []
for (let index = 0; index < 1000; index += 1) {
  const place = places[Math.floor(index / 100)]
  const district = districts[Math.floor(index / 10) % 10]
  const practice = practices[index % 10]
  const firstNineDigits = `559100${String(index).padStart(3, '0')}`
  const digits = firstNineDigits + luhnCheckDigit(firstNineDigits)
  clinics.push({
    name: `${place} ${district} ${practice}`,
    organisationNumber: `${digits.slice(0, 6)}-${digits.slice(6)}`,
  })
}

let state = 0x5eedc0de
for (let index = clinics.length - 1; index > 0; index -= 1) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0
  const swapIndex = state % (index + 1)
  ;[clinics[index], clinics[swapIndex]] = [clinics[swapIndex], clinics[index]]
}

writeFileSync(
  new URL('../src/main/resources/veterinary-clinics.json', import.meta.url),
  `${JSON.stringify(clinics, null, 2)}\n`,
)
