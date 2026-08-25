package dev.example.diagnosis;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/diagnoses")
public final class DiagnosisController {

    private final DiagnosisCatalog catalogue;

    public DiagnosisController(DiagnosisCatalog catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping
    public PageResponse<Diagnosis> diagnoses(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(DiagnosisCatalog.MAX_PAGE_SIZE) int size
    ) {
        return catalogue.search(q, page, size);
    }
}
