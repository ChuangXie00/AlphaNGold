package com.ang.backend.config;

import com.ang.backend.controller.MyProjExpController;
import com.ang.backend.controller.vo.in.MyProjExpInVO;
import com.ang.backend.exception.GlobalExceptionHandler;
import com.ang.backend.service.MyProjExpService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.MethodParameter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = MyProjExpController.class,
        properties = {
                "app.write-enabled=false",
                "app.rate-limit.enabled=true",
                "app.rate-limit.burst=1",
                "app.rate-limit.per-second=0.01"
        }
)
@ActiveProfiles("local")
@Import({
        WebConfig.class,
        GlobalExceptionHandler.class,
        JsonBodyLimitAdvice.class
})
class ApiRequestProtectionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MyProjExpService service;

    @Test
    void rateLimitedResponseRetainsCorsHeaders() throws Exception {
        when(service.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/projects")
                        .header("Origin", "http://localhost:5173")
                        .with(request -> {
                            request.setRemoteAddr("192.0.2.10");
                            return request;
                        }))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/projects")
                        .header("Origin", "http://localhost:5173")
                        .header("X-Forwarded-For", "198.51.100.99")
                        .with(request -> {
                            request.setRemoteAddr("192.0.2.10");
                            return request;
                        }))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string(
                        "Access-Control-Allow-Origin",
                        "http://localhost:5173"
                ))
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error.code")
                        .value("RATE_LIMITED"));

        verify(service, times(1)).findAll();
    }

    @Test
    void quotaRefillsAndForwardedHeaderDoesNotCreateNewQuota() {
        AtomicLong now = new AtomicLong();

        ApiRequestInterceptor limiter = new ApiRequestInterceptor(
                true, 1, 1.0, 10, 600, now::get
        );

        var request = requestFrom("192.0.2.20");

        assertThat(limiter.preHandle(
                request, new MockHttpServletResponse(), new Object()
        )).isTrue();

        request.addHeader("X-Forwarded-For", "198.51.100.20");

        assertThatThrownBy(() -> limiter.preHandle(
                request, new MockHttpServletResponse(), new Object()
        )).isInstanceOfSatisfying(
                ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value())
                        .isEqualTo(429)
        );

        now.set(1_000_000_000L);

        assertThat(limiter.preHandle(
                request, new MockHttpServletResponse(), new Object()
        )).isTrue();

        assertThat(limiter.preHandle(
                requestFrom("2001:db8::1"),
                new MockHttpServletResponse(),
                new Object()
        )).isTrue();
    }

    @Test
    void fullCacheRejectsNewClientsUntilExpiredEntriesAreReclaimed() {
        AtomicLong now = new AtomicLong();

        ApiRequestInterceptor limiter = new ApiRequestInterceptor(
                true, 1, 1.0, 1, 10, now::get
        );

        limiter.preHandle(
                requestFrom("192.0.2.30"),
                new MockHttpServletResponse(),
                new Object()
        );

        assertThatThrownBy(() -> limiter.preHandle(
                requestFrom("192.0.2.31"),
                new MockHttpServletResponse(),
                new Object()
        )).isInstanceOfSatisfying(
                ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value())
                        .isEqualTo(429)
        );

        now.set(10_000_000_000L);

        assertThat(limiter.preHandle(
                requestFrom("192.0.2.31"),
                new MockHttpServletResponse(),
                new Object()
        )).isTrue();
    }

    @Test
    void bodyLimitChecksActualBytesEvenWhenLengthHeaderIsWrong()
            throws Exception {
        JsonBodyLimitAdvice advice = new JsonBodyLimitAdvice(8);

        MockHttpInputMessage input = new MockHttpInputMessage(
                new ByteArrayInputStream(new byte[9])
        );
        input.getHeaders().setContentLength(1);

        MethodParameter parameter = new MethodParameter(
                MyProjExpController.class.getMethod(
                        "create", MyProjExpInVO.class
                ),
                0
        );

        assertThatThrownBy(() -> advice.beforeBodyRead(
                input,
                parameter,
                MyProjExpInVO.class,
                StringHttpMessageConverter.class
        )).isInstanceOfSatisfying(
                ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value())
                        .isEqualTo(413)
        );
    }

    private MockHttpServletRequest requestFrom(String address) {
        MockHttpServletRequest request =
                new MockHttpServletRequest(
                        "GET", "/api/v1/projects"
                );
        request.setRemoteAddr(address);
        return request;
    }
}