package com.ang.backend.controller;

import com.ang.backend.config.WebConfig;
import com.ang.backend.exception.GlobalExceptionHandler;
import com.ang.backend.service.MyProjExpService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = MyProjExpController.class,
        properties = "app.write-enabled=false"
)
@ActiveProfiles("local")
@Import({GlobalExceptionHandler.class, WebConfig.class})
class MyProjExpReadOnlyControllerTest {

    private static final String VALID_REQUEST = """
            {
              "titleZh": "测试项目",
              "titleEn": "Test project",
              "summaryZh": "测试简介",
              "summaryEn": "Test summary",
              "techStack": "Java",
              "projectUrl": "https://example.com/project",
              "displayOrder": 0
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MyProjExpService service;

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "http://localhost:5173",
            "https://untrusted.example"
    })
    void writesAreRejectedWithoutCallingService(String origin)
            throws Exception {
        List<MockHttpServletRequestBuilder> requests = List.of(
                post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_REQUEST),
                put("/api/v1/projects/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_REQUEST),
                delete("/api/v1/projects/1")
        );

        for (MockHttpServletRequestBuilder request : requests) {
            if (!origin.isEmpty()) {
                request.header("Origin", origin);
            }

            var result = mockMvc.perform(request)
                    .andExpect(status().isForbidden());

            // 非信任来源可能先被框架 CORS 拒绝。
            // 无 Origin 和允许来源应进入写开关判断。
            if (!origin.equals("https://untrusted.example")) {
                result
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.error.code")
                                .value("WRITE_DISABLED"));
            }
        }

        verifyNoInteractions(service);
    }
}