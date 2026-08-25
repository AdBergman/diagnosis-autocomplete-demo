package dev.example.diagnosis;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class DiagnosisDatasetTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void applicationCatalogueLoadsAndContainsExactlyTwelveThousandDiagnoses() {
        var catalogue = new DiagnosisCatalog(objectMapper);

        var firstPage = catalogue.search(null, 0, 20);

        assertThat(firstPage.totalElements()).isEqualTo(12_000);
        assertThat(firstPage.items()).hasSize(20);
    }

    @Test
    void sourceDataHasUniqueNonblankCodesAndDescriptions() throws IOException {
        var diagnoses = readDiagnoses();

        assertThat(diagnoses).hasSize(12_000);
        assertThat(diagnoses)
                .allSatisfy(diagnosis -> {
                    assertThat(diagnosis.code()).isNotBlank();
                    assertThat(diagnosis.description()).isNotBlank();
                });
        assertThat(new HashSet<>(Arrays.stream(diagnoses).map(Diagnosis::code).toList()))
                .hasSize(12_000);
    }

    @Test
    void sourceDataMixesHumanAndVeterinaryExamplesAndIncludesDiacritics() throws IOException {
        var diagnoses = readDiagnoses();

        assertThat(diagnoses).anyMatch(diagnosis -> diagnosis.code().startsWith("HUM-"));
        assertThat(diagnoses).anyMatch(diagnosis -> diagnosis.code().startsWith("VET-"));
        assertThat(diagnoses).anyMatch(diagnosis -> diagnosis.description().matches(".*[^\\p{ASCII}].*"));
    }

    @Test
    void sourceIsDeliberatelyUnsortedByCodeAndDescription() throws IOException {
        var diagnoses = Arrays.asList(readDiagnoses());
        var byCode = diagnoses.stream().sorted(Comparator.comparing(Diagnosis::code)).toList();
        var byDescription = diagnoses.stream().sorted(Comparator.comparing(Diagnosis::description)).toList();

        assertThat(diagnoses).isNotEqualTo(byCode);
        assertThat(diagnoses).isNotEqualTo(byDescription);
    }

    private Diagnosis[] readDiagnoses() throws IOException {
        try (var input = getClass().getResourceAsStream("/diagnoses.json")) {
            assertThat(input).as("diagnoses.json must be on the classpath").isNotNull();
            return objectMapper.readValue(input, Diagnosis[].class);
        }
    }
}
