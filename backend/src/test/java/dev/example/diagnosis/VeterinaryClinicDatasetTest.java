package dev.example.diagnosis;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class VeterinaryClinicDatasetTest {

    private static final Pattern ORGANISATION_NUMBER = Pattern.compile("\\d{6}-\\d{4}");
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void applicationCatalogueLoadsAndContainsExactlyOneThousandClinics() {
        var catalogue = new VeterinaryClinicCatalog(objectMapper);

        var firstPage = catalogue.search(null, 0, 20);

        assertThat(firstPage.totalElements()).isEqualTo(1_000);
        assertThat(firstPage.items()).hasSize(20);
    }

    @Test
    void sourceDataHasUniqueNamesAndSwedishFormatOrganisationNumbers() throws IOException {
        var clinics = readClinics();

        assertThat(clinics).hasSize(1_000);
        assertThat(clinics).allSatisfy(clinic -> {
            assertThat(clinic.name()).isNotBlank();
            assertThat(clinic.organisationNumber()).matches(ORGANISATION_NUMBER);
        });
        assertThat(new HashSet<>(Arrays.stream(clinics).map(VeterinaryClinic::name).toList()))
                .hasSize(1_000);
        assertThat(new HashSet<>(Arrays.stream(clinics).map(VeterinaryClinic::organisationNumber).toList()))
                .hasSize(1_000);
    }

    @Test
    void sourceIncludesSwedishCharactersAndIsDeliberatelyUnsorted() throws IOException {
        var clinics = Arrays.asList(readClinics());
        var byName = clinics.stream().sorted(Comparator.comparing(VeterinaryClinic::name)).toList();
        var byOrganisationNumber = clinics.stream()
                .sorted(Comparator.comparing(VeterinaryClinic::organisationNumber)).toList();

        assertThat(clinics).anyMatch(clinic -> clinic.name().matches(".*[^\\p{ASCII}].*"));
        assertThat(clinics).isNotEqualTo(byName);
        assertThat(clinics).isNotEqualTo(byOrganisationNumber);
    }

    private VeterinaryClinic[] readClinics() throws IOException {
        try (var input = getClass().getResourceAsStream("/veterinary-clinics.json")) {
            assertThat(input).as("veterinary-clinics.json must be on the classpath").isNotNull();
            return objectMapper.readValue(input, VeterinaryClinic[].class);
        }
    }
}
