package dev.example.diagnosis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class VeterinaryClinicCatalogTest {

    @Test
    void searchesOrganisationNumbersWithoutDependingOnSeparators() {
        var catalogue = VeterinaryClinicCatalog.containing(
                clinic("Åre Centrum Djurklinik", "559100-0004"),
                clinic("Åre Centrum Veterinärklinik", "559100-0012"),
                clinic("Malmö Park Djursjukhus", "559100-1622")
        );

        var matches = catalogue.search("559100 0012", 0, 20);

        assertThat(matches.items())
                .extracting(VeterinaryClinic::organisationNumber)
                .containsExactly("559100-0012");
    }

    @Test
    void searchesNamesAcrossTermsAndIgnoresDiacritics() {
        var catalogue = VeterinaryClinicCatalog.containing(
                clinic("Åre Centrum Djurklinik", "559100-0004"),
                clinic("Åre Centrum Veterinärklinik", "559100-0012"),
                clinic("Malmö Park Djursjukhus", "559100-1622")
        );

        var matches = catalogue.search("are djurklinik", 0, 20);

        assertThat(matches.items())
                .extracting(VeterinaryClinic::organisationNumber)
                .containsExactly("559100-0004");
    }

    @Test
    void ranksAnExactOrganisationNumberAheadOfItsPrefixes() {
        var catalogue = VeterinaryClinicCatalog.containing(
                clinic("Åre Centrum Djurklinik", "559100-0004"),
                clinic("Åre Centrum Veterinärklinik", "559100-0012"),
                clinic("Malmö Park Djursjukhus", "559100-1622")
        );

        var matches = catalogue.search("5591000012", 0, 20);

        assertThat(matches.items())
                .extracting(VeterinaryClinic::organisationNumber)
                .containsExactly("559100-0012");
    }

    @Test
    void browsesInStableNameOrderAndPagesAfterOrdering() {
        var catalogue = VeterinaryClinicCatalog.containing(
                clinic("Malmö Park Djursjukhus", "559100-1622"),
                clinic("Åre Centrum Veterinärklinik", "559100-0012"),
                clinic("Åre Centrum Djurklinik", "559100-0004")
        );

        var firstPage = catalogue.search(null, 0, 2);
        var secondPage = catalogue.search(null, 1, 2);

        assertThat(firstPage.items()).extracting(VeterinaryClinic::name)
                .containsExactly("Åre Centrum Djurklinik", "Åre Centrum Veterinärklinik");
        assertThat(firstPage.totalElements()).isEqualTo(3);
        assertThat(firstPage.hasNext()).isTrue();
        assertThat(secondPage.items()).extracting(VeterinaryClinic::name)
                .containsExactly("Malmö Park Djursjukhus");
        assertThat(secondPage.hasNext()).isFalse();
    }

    @Test
    void rejectsInvalidClinicRecordsClearly() {
        assertThatThrownBy(() -> VeterinaryClinicCatalog.containing(
                clinic(" ", "559100-0004")
        )).isInstanceOf(IllegalStateException.class).hasMessageContaining("name must be nonblank");
        assertThatThrownBy(() -> VeterinaryClinicCatalog.containing(
                clinic("Valid name", "5591000004")
        )).isInstanceOf(IllegalStateException.class).hasMessageContaining("NNNNNN-NNNN");
        assertThatThrownBy(() -> VeterinaryClinicCatalog.containing(
                clinic("Valid name", "559100-0005")
        )).isInstanceOf(IllegalStateException.class).hasMessageContaining("Luhn");
        assertThatThrownBy(() -> VeterinaryClinicCatalog.containing(
                clinic("First", "559100-0004"),
                clinic("Second", "559100-0004")
        )).isInstanceOf(IllegalStateException.class).hasMessageContaining("duplicate: 559100-0004");
    }

    @Test
    void enforcesPagingBoundsOutsideTheHttpLayerToo() {
        var catalogue = VeterinaryClinicCatalog.containing(
                clinic("Åre Centrum Djurklinik", "559100-0004")
        );

        assertThatThrownBy(() -> catalogue.search(null, -1, 20))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("page");
        assertThatThrownBy(() -> catalogue.search(null, 0, 0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("size");
        assertThatThrownBy(() -> catalogue.search(null, 0, 51))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("50");
    }

    private static VeterinaryClinic clinic(String name, String organisationNumber) {
        return new VeterinaryClinic(name, organisationNumber);
    }
}
