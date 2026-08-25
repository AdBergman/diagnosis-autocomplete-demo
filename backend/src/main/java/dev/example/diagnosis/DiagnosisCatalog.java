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
public final class DiagnosisCatalog {

    static final int EXPECTED_DIAGNOSIS_COUNT = 12_000;
    static final int MAX_PAGE_SIZE = 50;

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private static final Comparator<SearchableDiagnosis> HUMAN_FRIENDLY_ORDER = Comparator
            .comparing(SearchableDiagnosis::normalizedDescription)
            .thenComparing(SearchableDiagnosis::normalizedCode)
            .thenComparing(entry -> entry.diagnosis().description())
            .thenComparing(entry -> entry.diagnosis().code());

    private final List<SearchableDiagnosis> catalogue;

    @Autowired
    public DiagnosisCatalog(ObjectMapper objectMapper) {
        this.catalogue = indexAndValidate(readCatalogue(objectMapper), EXPECTED_DIAGNOSIS_COUNT);
    }

    private DiagnosisCatalog(List<Diagnosis> diagnoses, int expectedCount) {
        this.catalogue = indexAndValidate(diagnoses, expectedCount);
    }

    static DiagnosisCatalog containing(Diagnosis... diagnoses) {
        return new DiagnosisCatalog(List.of(diagnoses), diagnoses.length);
    }

    public PageResponse<Diagnosis> search(String query, int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must not be negative");
        }
        if (size < 1) {
            throw new IllegalArgumentException("size must be positive");
        }
        if (size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size must not exceed " + MAX_PAGE_SIZE);
        }

        var normalizedQuery = NormalizedQuery.from(query);
        var orderedMatches = normalizedQuery.isEmpty()
                ? catalogue.stream().sorted(HUMAN_FRIENDLY_ORDER).toList()
                : rankedMatches(normalizedQuery);
        var diagnoses = orderedMatches.stream().map(SearchableDiagnosis::diagnosis).toList();
        return PageResponse.slice(diagnoses, page, size);
    }

    private List<SearchableDiagnosis> rankedMatches(NormalizedQuery query) {
        var matches = new ArrayList<RankedDiagnosis>();
        for (var diagnosis : catalogue) {
            var relevance = relevance(diagnosis, query);
            if (relevance != Relevance.NO_MATCH) {
                matches.add(new RankedDiagnosis(diagnosis, relevance));
            }
        }

        matches.sort(Comparator
                .comparing(RankedDiagnosis::relevance)
                .thenComparing(RankedDiagnosis::diagnosis, HUMAN_FRIENDLY_ORDER));
        return matches.stream().map(RankedDiagnosis::diagnosis).toList();
    }

    private Relevance relevance(SearchableDiagnosis diagnosis, NormalizedQuery query) {
        if (diagnosis.compactCode().equals(query.compact())) {
            return Relevance.EXACT_CODE;
        }
        if (diagnosis.compactCode().startsWith(query.compact())) {
            return Relevance.CODE_PREFIX;
        }
        if (diagnosis.normalizedDescription().equals(query.text())) {
            return Relevance.EXACT_DESCRIPTION;
        }
        if (diagnosis.normalizedDescription().startsWith(query.text())) {
            return Relevance.DESCRIPTION_PREFIX;
        }
        if (query.terms().stream().allMatch(diagnosis.searchableText()::contains)) {
            return Relevance.ALL_TERMS;
        }
        if (diagnosis.normalizedDescription().contains(query.text())) {
            return Relevance.DESCRIPTION_CONTAINS;
        }
        if (diagnosis.compactCode().contains(query.compact())) {
            return Relevance.CODE_CONTAINS;
        }
        return Relevance.NO_MATCH;
    }

    private static List<Diagnosis> readCatalogue(ObjectMapper objectMapper) {
        try (InputStream input = DiagnosisCatalog.class.getResourceAsStream("/diagnoses.json")) {
            if (input == null) {
                throw new IllegalStateException("Classpath resource diagnoses.json was not found");
            }
            Diagnosis[] diagnoses = objectMapper.readValue(input, Diagnosis[].class);
            if (diagnoses == null) {
                throw new IllegalStateException("Classpath resource diagnoses.json must contain a JSON array");
            }
            return Arrays.asList(diagnoses);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read classpath resource diagnoses.json", exception);
        }
    }

    private static List<SearchableDiagnosis> indexAndValidate(List<Diagnosis> diagnoses, int expectedCount) {
        if (diagnoses.size() != expectedCount) {
            throw new IllegalStateException(
                    "Diagnosis catalogue must contain exactly %d entries but contained %d"
                            .formatted(expectedCount, diagnoses.size())
            );
        }

        var codes = new HashSet<String>();
        var searchableDiagnoses = new ArrayList<SearchableDiagnosis>(diagnoses.size());
        for (var diagnosis : diagnoses) {
            if (diagnosis == null) {
                throw new IllegalStateException("Diagnosis catalogue must not contain null entries");
            }
            if (diagnosis.code() == null || diagnosis.code().isBlank()) {
                throw new IllegalStateException("Every diagnosis code must be nonblank");
            }
            if (diagnosis.description() == null || diagnosis.description().isBlank()) {
                throw new IllegalStateException("Every diagnosis description must be nonblank");
            }
            if (!codes.add(diagnosis.code())) {
                throw new IllegalStateException("Diagnosis codes must be unique; duplicate: " + diagnosis.code());
            }
            searchableDiagnoses.add(SearchableDiagnosis.from(diagnosis));
        }
        return List.copyOf(searchableDiagnoses);
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
        EXACT_CODE,
        CODE_PREFIX,
        EXACT_DESCRIPTION,
        DESCRIPTION_PREFIX,
        ALL_TERMS,
        DESCRIPTION_CONTAINS,
        CODE_CONTAINS,
        NO_MATCH
    }

    private record SearchableDiagnosis(
            Diagnosis diagnosis,
            String normalizedCode,
            String compactCode,
            String normalizedDescription,
            String searchableText
    ) {

        static SearchableDiagnosis from(Diagnosis diagnosis) {
            var normalizedCode = normalizeText(diagnosis.code());
            var normalizedDescription = normalizeText(diagnosis.description());
            return new SearchableDiagnosis(
                    diagnosis,
                    normalizedCode,
                    compact(diagnosis.code()),
                    normalizedDescription,
                    normalizedCode + " " + compact(diagnosis.code()) + " " + normalizedDescription
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
            return new NormalizedQuery(text, DiagnosisCatalog.compact(query), terms);
        }

        boolean isEmpty() {
            return compact.isEmpty() && terms.isEmpty();
        }
    }

    private record RankedDiagnosis(SearchableDiagnosis diagnosis, Relevance relevance) {
    }
}
