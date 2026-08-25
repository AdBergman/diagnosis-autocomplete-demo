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

@WebMvcTest(DiagnosisController.class)
@Import(DiagnosisControllerTest.CatalogueConfiguration.class)
class DiagnosisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void browsesTheCatalogueWithDefaultPaging() throws Exception {
        mockMvc.perform(get("/api/diagnoses"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.items", hasSize(4)))
                .andExpect(jsonPath("$.items[0].code").value("HUM-000001"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void searchesAndPagesFilteredResults() throws Exception {
        mockMvc.perform(get("/api/diagnoses")
                        .queryParam("q", "RENAL")
                        .queryParam("page", "1")
                        .queryParam("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].code").value("VET-000002"))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void returnsProblemDetailsForInvalidPaging() throws Exception {
        mockMvc.perform(get("/api/diagnoses").queryParam("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").isNotEmpty());

        mockMvc.perform(get("/api/diagnoses").queryParam("size", "51"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void returnsProblemDetailsForANonnumericPage() throws Exception {
        mockMvc.perform(get("/api/diagnoses").queryParam("page", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class CatalogueConfiguration {

        @Bean
        DiagnosisCatalog diagnosisCatalog() {
            return DiagnosisCatalog.containing(
                    new Diagnosis("VET-000003", "Equine ocular disorder"),
                    new Diagnosis("HUM-000004", "Renal syndrome"),
                    new Diagnosis("VET-000002", "Canine renal syndrome"),
                    new Diagnosis("HUM-000001", "Acute renal syndrome")
            );
        }
    }
}
