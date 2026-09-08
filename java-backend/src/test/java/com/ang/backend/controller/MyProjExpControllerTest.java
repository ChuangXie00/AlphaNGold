package com.ang.backend.controller;

import com.ang.backend.config.WebConfig;
import com.ang.backend.exception.GlobalExceptionHandler;
import com.ang.backend.exception.ResourceNotFoundException;
import com.ang.backend.service.MyProjExpService;
import com.ang.backend.service.dto.in.MyProjExpInDTO;
import com.ang.backend.service.dto.out.MyProjExpOutDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MyProjExpController.class)
@Import({GlobalExceptionHandler.class, WebConfig.class})
class MyProjExpControllerTest {

    private static final String VALID_REQUEST = """
            {
              "titleZh": "阿尔法金",
              "titleEn": "AlphaNGold",
              "summaryZh": "中文简介",
              "summaryEn": "English summary",
              "techStack": "Java, Spring Boot, PostgreSQL",
              "projectUrl": "https://example.com/alphangold",
              "displayOrder": 2
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MyProjExpService service;

    @Test
    void findAllReturnsProjectsInApiResponse() throws Exception {
        when(service.findAll()).thenReturn(List.of(output(1L)));

        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].titleEn").value("AlphaNGold"))
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void findByIdReturnsProject() throws Exception {
        when(service.findById(5L)).thenReturn(output(5L));

        mockMvc.perform(get("/api/v1/projects/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(5));
    }

    @Test
    void createReturnsCreatedAndMapsInputToDto() throws Exception {
        when(service.create(org.mockito.ArgumentMatchers.any(MyProjExpInDTO.class)))
                .thenReturn(output(10L));

        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_REQUEST))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10));

        ArgumentCaptor<MyProjExpInDTO> captor = ArgumentCaptor.forClass(MyProjExpInDTO.class);
        verify(service).create(captor.capture());
        assertThat(captor.getValue()).isEqualTo(input(2));
    }

    @Test
    void updateReturnsUpdatedProjectAndMapsInputToDto() throws Exception {
        when(service.update(org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.any(MyProjExpInDTO.class)))
                .thenReturn(output(10L));

        mockMvc.perform(put("/api/v1/projects/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10));

        ArgumentCaptor<MyProjExpInDTO> captor = ArgumentCaptor.forClass(MyProjExpInDTO.class);
        verify(service).update(org.mockito.ArgumentMatchers.eq(10L), captor.capture());
        assertThat(captor.getValue()).isEqualTo(input(2));
    }

    @Test
    void deleteReturnsEmptySuccessResponse() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error").doesNotExist())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());

        verify(service).delete(12L);
    }

    @Test
    void invalidCreateReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Request validation failed"))
                .andExpect(jsonPath("$.error.details.titleZh").isNotEmpty())
                .andExpect(jsonPath("$.error.details.titleEn").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    void negativeDisplayOrderReturnsValidationError() throws Exception {
        String invalidRequest = VALID_REQUEST.replace("\"displayOrder\": 2", "\"displayOrder\": -1");

        mockMvc.perform(put("/api/v1/projects/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details.displayOrder").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    void missingProjectReturnsNotFoundError() throws Exception {
        when(service.findById(404L))
                .thenThrow(new ResourceNotFoundException("My project experience not found: 404"));

        mockMvc.perform(get("/api/v1/projects/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message")
                        .value("My project experience not found: 404"))
                .andExpect(jsonPath("$.error.details").isEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void malformedJsonReturnsInvalidRequestBodyError() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not-json}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST_BODY"))
                .andExpect(jsonPath("$.error.message")
                        .value("Request body is missing or invalid"));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:5173", "http://localhost:5174"})
    void corsPreflightAllowsConfiguredOrigins(String origin) throws Exception {
        mockMvc.perform(options("/api/v1/projects")
                        .header(HttpHeaders.ORIGIN, origin)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
                        org.hamcrest.Matchers.containsString("GET")));
    }

    @Test
    void corsPreflightRejectsUnknownOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/projects")
                        .header(HttpHeaders.ORIGIN, "https://untrusted.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    private MyProjExpInDTO input(Integer displayOrder) {
        return new MyProjExpInDTO(
                "阿尔法金",
                "AlphaNGold",
                "中文简介",
                "English summary",
                "Java, Spring Boot, PostgreSQL",
                "https://example.com/alphangold",
                displayOrder
        );
    }

    private MyProjExpOutDTO output(Long id) {
        OffsetDateTime createdAt = OffsetDateTime.of(2026, 9, 8, 12, 0, 0, 0, ZoneOffset.UTC);
        return new MyProjExpOutDTO(
                id,
                "阿尔法金",
                "AlphaNGold",
                "中文简介",
                "English summary",
                "Java, Spring Boot, PostgreSQL",
                "https://example.com/alphangold",
                2,
                createdAt,
                createdAt.plusMinutes(1)
        );
    }
}
