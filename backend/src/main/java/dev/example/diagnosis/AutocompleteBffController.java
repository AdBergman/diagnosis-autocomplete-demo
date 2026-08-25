package dev.example.diagnosis;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bff/autocompletes/veterinary-clinics")
public final class AutocompleteBffController {

    private static final String SEARCH_URL = "/api/bff/autocompletes/veterinary-clinics/items";

    private final VeterinaryClinicCatalog catalogue;

    public AutocompleteBffController(VeterinaryClinicCatalog catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping
    public AutocompleteConfiguration configuration() {
        return new AutocompleteConfiguration(
                "Find a veterinary clinic through the BFF",
                SEARCH_URL
        );
    }

    @GetMapping("/items")
    public PageResponse<AutocompleteItem> items(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(VeterinaryClinicCatalog.MAX_PAGE_SIZE) int size
    ) {
        return catalogue.search(q, page, size)
                .map(clinic -> new AutocompleteItem(
                        clinic.organisationNumber(),
                        clinic.name(),
                        clinic.organisationNumber()
                ));
    }
}
