package dev.example.diagnosis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class DiagnosisCatalogTest {

    @Test
    void searchesCodesWithoutDependingOnCaseOrSeparators() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("VET-001230", "Canine renal syndrome"),
                diagnosis("VET-001231", "Feline respiratory syndrome"),
                diagnosis("HUM-001230", "Human renal syndrome")
        );

        var matches = catalogue.search("  vet 00123 ", 0, 20);

        assertThat(matches.items())
                .extracting(Diagnosis::code)
                .containsExactly("VET-001230", "VET-001231");
    }

    @Test
    void searchesDescriptionsCaseInsensitivelyAndAcrossTerms() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("VET-000002", "Chronic canine inflammatory renal disorder"),
                diagnosis("VET-000001", "Acute canine respiratory disorder"),
                diagnosis("HUM-000001", "Acute renal disorder")
        );

        var matches = catalogue.search(" CANINE   RENAL ", 0, 20);

        assertThat(matches.items())
                .extracting(Diagnosis::code)
                .containsExactly("VET-000002");
    }

    @Test
    void ignoresDiacriticsInDescriptions() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("HUM-000001", "Synthetic Ménière neurological syndrome"),
                diagnosis("HUM-000002", "Synthetic ocular syndrome")
        );

        var matches = catalogue.search("meniere", 0, 20);

        assertThat(matches.items())
                .extracting(Diagnosis::code)
                .containsExactly("HUM-000001");
    }

    @Test
    void ranksAnExactCodeAheadOfCodePrefixes() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("VET-001230", "Alpha disorder"),
                diagnosis("VET-00123", "Zulu disorder")
        );

        var matches = catalogue.search("vet 00123", 0, 20);

        assertThat(matches.items())
                .extracting(Diagnosis::code)
                .containsExactly("VET-00123", "VET-001230");
    }

    @Test
    void ranksExactDescriptionThenDescriptionPrefixThenAllTerms() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("HUM-000003", "Chronic renal inflammatory syndrome"),
                diagnosis("HUM-000002", "Renal syndrome chronic"),
                diagnosis("HUM-000001", "Renal syndrome")
        );

        var matches = catalogue.search("renal syndrome", 0, 20);

        assertThat(matches.items())
                .extracting(Diagnosis::code)
                .containsExactly("HUM-000001", "HUM-000002", "HUM-000003");
    }

    @Test
    void orderingIsDeterministicRegardlessOfSourceOrder() {
        var alpha = diagnosis("HUM-000001", "Alpha renal disorder");
        var beta = diagnosis("HUM-000002", "Beta renal disorder");
        var zeta = diagnosis("VET-000001", "Zeta ocular disorder");
        var forward = DiagnosisCatalog.containing(zeta, beta, alpha);
        var reversed = DiagnosisCatalog.containing(alpha, beta, zeta);

        assertThat(forward.search(null, 0, 20).items())
                .containsExactlyElementsOf(reversed.search(null, 0, 20).items());
        assertThat(forward.search("renal", 0, 20).items())
                .containsExactlyElementsOf(reversed.search("renal", 0, 20).items());
    }

    @Test
    void pagesOnlyAfterStableOrdering() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("HUM-000007", "Golf disorder"),
                diagnosis("HUM-000003", "Charlie disorder"),
                diagnosis("HUM-000001", "Alpha disorder"),
                diagnosis("HUM-000006", "Foxtrot disorder"),
                diagnosis("HUM-000002", "Bravo disorder"),
                diagnosis("HUM-000005", "Echo disorder"),
                diagnosis("HUM-000004", "Delta disorder")
        );

        var first = catalogue.search(null, 0, 3);
        var later = catalogue.search(null, 1, 3);
        var last = catalogue.search(null, 2, 3);

        assertThat(first.items()).extracting(Diagnosis::code)
                .containsExactly("HUM-000001", "HUM-000002", "HUM-000003");
        assertThat(first.page()).isZero();
        assertThat(first.size()).isEqualTo(3);
        assertThat(first.totalElements()).isEqualTo(7);
        assertThat(first.totalPages()).isEqualTo(3);
        assertThat(first.hasNext()).isTrue();

        assertThat(later.items()).extracting(Diagnosis::code)
                .containsExactly("HUM-000004", "HUM-000005", "HUM-000006");
        assertThat(later.hasNext()).isTrue();

        assertThat(last.items()).extracting(Diagnosis::code).containsExactly("HUM-000007");
        assertThat(last.size()).isEqualTo(3);
        assertThat(last.hasNext()).isFalse();
    }

    @Test
    void reportsFilteredTotalsAndSupportsAPartialFinalPage() {
        var catalogue = DiagnosisCatalog.containing(
                diagnosis("HUM-000001", "Alpha renal disorder"),
                diagnosis("HUM-000002", "Beta renal disorder"),
                diagnosis("VET-000001", "Canine renal disorder"),
                diagnosis("VET-000002", "Canine ocular disorder")
        );

        var finalPage = catalogue.search("renal", 1, 2);

        assertThat(finalPage.items()).extracting(Diagnosis::code).containsExactly("VET-000001");
        assertThat(finalPage.totalElements()).isEqualTo(3);
        assertThat(finalPage.totalPages()).isEqualTo(2);
        assertThat(finalPage.hasNext()).isFalse();
    }

    @Test
    void returnsAnEmptyPageBeyondTheLastPageWithoutChangingTotals() {
        var catalogue = DiagnosisCatalog.containing(diagnosis("HUM-000001", "Alpha disorder"));

        var page = catalogue.search(null, 4, 20);

        assertThat(page.items()).isEmpty();
        assertThat(page.totalElements()).isOne();
        assertThat(page.totalPages()).isOne();
        assertThat(page.hasNext()).isFalse();
    }

    @Test
    void rejectsInvalidCatalogueRecordsClearly() {
        assertThatThrownBy(() -> DiagnosisCatalog.containing(diagnosis(" ", "Valid description")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("code must be nonblank");
        assertThatThrownBy(() -> DiagnosisCatalog.containing(diagnosis("HUM-000001", " ")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("description must be nonblank");
        assertThatThrownBy(() -> DiagnosisCatalog.containing(
                diagnosis("HUM-000001", "First description"),
                diagnosis("HUM-000001", "Second description")
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("duplicate: HUM-000001");
    }

    @Test
    void enforcesPagingBoundsOutsideTheHttpLayerToo() {
        var catalogue = DiagnosisCatalog.containing(diagnosis("HUM-000001", "Alpha disorder"));

        assertThatThrownBy(() -> catalogue.search(null, -1, 20))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("page");
        assertThatThrownBy(() -> catalogue.search(null, 0, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("size");
        assertThatThrownBy(() -> catalogue.search(null, 0, 51))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("50");
    }

    private static Diagnosis diagnosis(String code, String description) {
        return new Diagnosis(code, description);
    }
}
