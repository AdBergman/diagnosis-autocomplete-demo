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

@WebMvcTest(VeterinaryClinicController.class)
@Import(VeterinaryClinicControllerTest.CatalogueConfiguration.class)
class VeterinaryClinicControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void browsesTheCatalogueWithDefaultPaging() throws Exception {
        mockMvc.perform(get("/api/veterinary-clinics"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[0].name").value("Åre Centrum Djurklinik"))
                .andExpect(jsonPath("$.items[0].organisationNumber").value("559100-0004"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void searchesNamesAndOrganisationNumbers() throws Exception {
        mockMvc.perform(get("/api/veterinary-clinics")
                        .queryParam("q", "malmo park")
                        .queryParam("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].organisationNumber").value("559100-1622"));

        mockMvc.perform(get("/api/veterinary-clinics")
                        .queryParam("q", "5591000012"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].name").value("Åre Centrum Veterinärklinik"));
    }

    @Test
    void returnsProblemDetailsForInvalidPaging() throws Exception {
        mockMvc.perform(get("/api/veterinary-clinics").queryParam("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));

        mockMvc.perform(get("/api/veterinary-clinics").queryParam("size", "51"))
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
