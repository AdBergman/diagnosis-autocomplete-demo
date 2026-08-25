package dev.example.diagnosis;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/veterinary-clinics")
public final class VeterinaryClinicController {

    private final VeterinaryClinicCatalog catalogue;

    public VeterinaryClinicController(VeterinaryClinicCatalog catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping
    public PageResponse<VeterinaryClinic> clinics(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(VeterinaryClinicCatalog.MAX_PAGE_SIZE) int size
    ) {
        return catalogue.search(q, page, size);
    }
}
