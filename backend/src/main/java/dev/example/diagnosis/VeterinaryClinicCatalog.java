package dev.example.diagnosis;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public final class VeterinaryClinicCatalog {

    static final int EXPECTED_CLINIC_COUNT = 1_000;
    static final int MAX_PAGE_SIZE = 50;

    private static final Pattern ORGANISATION_NUMBER = Pattern.compile("\\d{6}-\\d{4}");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private static final Comparator<SearchableClinic> HUMAN_FRIENDLY_ORDER = Comparator
            .comparing(SearchableClinic::normalizedName)
            .thenComparing(SearchableClinic::compactOrganisationNumber)
            .thenComparing(entry -> entry.clinic().name())
            .thenComparing(entry -> entry.clinic().organisationNumber());

    private final List<SearchableClinic> catalogue;

    @Autowired
    public VeterinaryClinicCatalog(ObjectMapper objectMapper) {
        this.catalogue = indexAndValidate(readCatalogue(objectMapper), EXPECTED_CLINIC_COUNT);
    }

    private VeterinaryClinicCatalog(List<VeterinaryClinic> clinics, int expectedCount) {
        this.catalogue = indexAndValidate(clinics, expectedCount);
    }

    static VeterinaryClinicCatalog containing(VeterinaryClinic... clinics) {
        return new VeterinaryClinicCatalog(List.of(clinics), clinics.length);
    }

    public PageResponse<VeterinaryClinic> search(String query, int page, int size) {
        validatePaging(page, size);

        var normalizedQuery = NormalizedQuery.from(query);
        var orderedMatches = normalizedQuery.isEmpty()
                ? catalogue.stream().sorted(HUMAN_FRIENDLY_ORDER).toList()
                : rankedMatches(normalizedQuery);
        var clinics = orderedMatches.stream().map(SearchableClinic::clinic).toList();
        return PageResponse.slice(clinics, page, size);
    }

    private static void validatePaging(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must not be negative");
        }
        if (size < 1) {
            throw new IllegalArgumentException("size must be positive");
        }
        if (size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size must not exceed " + MAX_PAGE_SIZE);
        }
    }

    private List<SearchableClinic> rankedMatches(NormalizedQuery query) {
        var matches = new ArrayList<RankedClinic>();
        for (var clinic : catalogue) {
            var relevance = relevance(clinic, query);
            if (relevance != Relevance.NO_MATCH) {
                matches.add(new RankedClinic(clinic, relevance));
            }
        }

        matches.sort(Comparator
                .comparing(RankedClinic::relevance)
                .thenComparing(RankedClinic::clinic, HUMAN_FRIENDLY_ORDER));
        return matches.stream().map(RankedClinic::clinic).toList();
    }

    private Relevance relevance(SearchableClinic clinic, NormalizedQuery query) {
        if (clinic.compactOrganisationNumber().equals(query.compact())) {
            return Relevance.EXACT_ORGANISATION_NUMBER;
        }
        if (clinic.compactOrganisationNumber().startsWith(query.compact())) {
            return Relevance.ORGANISATION_NUMBER_PREFIX;
        }
        if (clinic.normalizedName().equals(query.text())) {
            return Relevance.EXACT_NAME;
        }
        if (clinic.normalizedName().startsWith(query.text())) {
            return Relevance.NAME_PREFIX;
        }
        if (query.terms().stream().allMatch(clinic.searchableText()::contains)) {
            return Relevance.ALL_TERMS;
        }
        if (clinic.normalizedName().contains(query.text())) {
            return Relevance.NAME_CONTAINS;
        }
        if (clinic.compactOrganisationNumber().contains(query.compact())) {
            return Relevance.ORGANISATION_NUMBER_CONTAINS;
        }
        return Relevance.NO_MATCH;
    }

    private static List<VeterinaryClinic> readCatalogue(ObjectMapper objectMapper) {
        try (InputStream input = VeterinaryClinicCatalog.class.getResourceAsStream("/veterinary-clinics.json")) {
            if (input == null) {
                throw new IllegalStateException("Classpath resource veterinary-clinics.json was not found");
            }
            VeterinaryClinic[] clinics = objectMapper.readValue(input, VeterinaryClinic[].class);
            if (clinics == null) {
                throw new IllegalStateException("Classpath resource veterinary-clinics.json must contain a JSON array");
            }
            return Arrays.asList(clinics);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read classpath resource veterinary-clinics.json", exception);
        }
    }

    private static List<SearchableClinic> indexAndValidate(List<VeterinaryClinic> clinics, int expectedCount) {
        if (clinics.size() != expectedCount) {
            throw new IllegalStateException(
                    "Veterinary clinic catalogue must contain exactly %d entries but contained %d"
                            .formatted(expectedCount, clinics.size())
            );
        }

        var organisationNumbers = new HashSet<String>();
        var searchableClinics = new ArrayList<SearchableClinic>(clinics.size());
        for (var clinic : clinics) {
            if (clinic == null) {
                throw new IllegalStateException("Veterinary clinic catalogue must not contain null entries");
            }
            if (clinic.name() == null || clinic.name().isBlank()) {
                throw new IllegalStateException("Every veterinary clinic name must be nonblank");
            }
            if (clinic.organisationNumber() == null
                    || !ORGANISATION_NUMBER.matcher(clinic.organisationNumber()).matches()) {
                throw new IllegalStateException(
                        "Every organisation number must use the NNNNNN-NNNN format: "
                                + clinic.organisationNumber()
                );
            }
            if (!hasValidLuhnChecksum(clinic.organisationNumber())) {
                throw new IllegalStateException(
                        "Every organisation number must have a valid Luhn checksum: "
                                + clinic.organisationNumber()
                );
            }
            if (!organisationNumbers.add(clinic.organisationNumber())) {
                throw new IllegalStateException(
                        "Organisation numbers must be unique; duplicate: " + clinic.organisationNumber()
                );
            }
            searchableClinics.add(SearchableClinic.from(clinic));
        }
        return List.copyOf(searchableClinics);
    }

    private static boolean hasValidLuhnChecksum(String organisationNumber) {
        var digits = organisationNumber.replace("-", "");
        var sum = 0;
        for (var index = 0; index < digits.length(); index++) {
            var value = Character.digit(digits.charAt(index), 10) * (index % 2 == 0 ? 2 : 1);
            sum += value > 9 ? value - 9 : value;
        }
        return sum % 10 == 0;
    }

    private static String normalizeText(String value) {
        var decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        var withoutDiacritics = DIACRITICS.matcher(decomposed).replaceAll("");
        return WHITESPACE.matcher(withoutDiacritics.toLowerCase(Locale.ROOT).trim()).replaceAll(" ");
    }

    private static String compact(String value) {
        return NON_ALPHANUMERIC.matcher(normalizeText(value)).replaceAll("");
    }

    private enum Relevance {
        EXACT_ORGANISATION_NUMBER,
        ORGANISATION_NUMBER_PREFIX,
        EXACT_NAME,
        NAME_PREFIX,
        ALL_TERMS,
        NAME_CONTAINS,
        ORGANISATION_NUMBER_CONTAINS,
        NO_MATCH
    }

    private record SearchableClinic(
            VeterinaryClinic clinic,
            String normalizedName,
            String compactOrganisationNumber,
            String searchableText
    ) {

        static SearchableClinic from(VeterinaryClinic clinic) {
            var normalizedName = normalizeText(clinic.name());
            var compactOrganisationNumber = compact(clinic.organisationNumber());
            return new SearchableClinic(
                    clinic,
                    normalizedName,
                    compactOrganisationNumber,
                    normalizedName + " " + compactOrganisationNumber
            );
        }
    }

    private record NormalizedQuery(String text, String compact, List<String> terms) {

        static NormalizedQuery from(String query) {
            if (query == null || query.isBlank()) {
                return new NormalizedQuery("", "", List.of());
            }
            var text = normalizeText(query);
            var terms = Arrays.stream(NON_ALPHANUMERIC.split(text))
                    .filter(term -> !term.isBlank())
                    .toList();
            return new NormalizedQuery(text, VeterinaryClinicCatalog.compact(query), terms);
        }

        boolean isEmpty() {
            return compact.isEmpty() && terms.isEmpty();
        }
    }

    private record RankedClinic(SearchableClinic clinic, Relevance relevance) {
    }
}
