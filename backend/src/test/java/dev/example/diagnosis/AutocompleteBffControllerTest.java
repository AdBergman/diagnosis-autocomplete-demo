package dev.example.diagnosis;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AutocompleteBffController.class)
@Import(AutocompleteBffControllerTest.CatalogueConfiguration.class)
class AutocompleteBffControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void servesPresentationConfiguration() throws Exception {
        mockMvc.perform(get("/api/bff/autocompletes/veterinary-clinics"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.heading")
                        .value("Find a veterinary clinic through the BFF"))
                .andExpect(jsonPath("$.searchUrl")
                        .value("/api/bff/autocompletes/veterinary-clinics/items"));
    }

    @Test
    void projectsDomainRecordsToOneCanonicalItemShape() throws Exception {
        mockMvc.perform(get("/api/bff/autocompletes/veterinary-clinics/items")
                        .queryParam("q", "5591000012"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value("559100-0012"))
                .andExpect(jsonPath("$.items[0].label").value("Åre Centrum Veterinärklinik"))
                .andExpect(jsonPath("$.items[0].description").value("559100-0012"))
                .andExpect(jsonPath("$.items[0].name").doesNotExist())
                .andExpect(jsonPath("$.items[0].organisationNumber").doesNotExist())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void preservesCatalogueOrderAndPagingMetadata() throws Exception {
        mockMvc.perform(get("/api/bff/autocompletes/veterinary-clinics/items")
                        .queryParam("page", "1")
                        .queryParam("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value("559100-0012"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.hasNext").value(true));
    }

    @Test
    void preservesPagingValidationAtTheBffBoundary() throws Exception {
        mockMvc.perform(get("/api/bff/autocompletes/veterinary-clinics/items")
                        .queryParam("size", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class CatalogueConfiguration {

        @Bean
        VeterinaryClinicCatalog veterinaryClinicCatalog() {
            return VeterinaryClinicCatalog.containing(
                    new VeterinaryClinic("Malmö Park Djursjukhus", "559100-1622"),
                    new VeterinaryClinic("Åre Centrum Veterinärklinik", "559100-0012"),
                    new VeterinaryClinic("Åre Centrum Djurklinik", "559100-0004")
            );
        }
    }
}
