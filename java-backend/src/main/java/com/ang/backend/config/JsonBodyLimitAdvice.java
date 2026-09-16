package com.ang.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.util.Assert;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;

// TODO: 若以后由Nginx网关统一限制请求体大小，确认后端无法被绕过，且超限响应（413）及 CORS 已验证后，再评估移除此类；保留 VO 中的 @Size 等字段校验。
@ControllerAdvice
public class JsonBodyLimitAdvice extends RequestBodyAdviceAdapter {

    private final int maxBytes;

    public JsonBodyLimitAdvice(
            @Value("${app.http.max-json-bytes:65536}") int maxBytes
    ) {
        Assert.isTrue(
                maxBytes > 0 && maxBytes < Integer.MAX_VALUE,
                "max-json-bytes is invalid"
        );
        this.maxBytes = maxBytes;
    }

    @Override
    public boolean supports(
            MethodParameter parameter,
            Type targetType,
            Class<? extends HttpMessageConverter<?>> converterType
    ) {
        return true;
    }

    @Override
    public HttpInputMessage beforeBodyRead(
            HttpInputMessage input,
            MethodParameter parameter,
            Type targetType,
            Class<? extends HttpMessageConverter<?>> converterType
    ) throws IOException {
        String encoding = input.getHeaders()
                .getFirst(HttpHeaders.CONTENT_ENCODING);

        if (encoding != null
                && !"identity".equalsIgnoreCase(encoding)) {
            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Compressed request bodies are not supported"
            );
        }

        if (input.getHeaders().getContentLength() > maxBytes) {
            throw new ResponseStatusException(
                    HttpStatus.CONTENT_TOO_LARGE
            );
        }

        byte[] body = input.getBody().readNBytes(maxBytes + 1);

        if (body.length > maxBytes) {
            throw new ResponseStatusException(
                    HttpStatus.CONTENT_TOO_LARGE
            );
        }

        return new HttpInputMessage() {
            @Override
            public InputStream getBody() {
                return new ByteArrayInputStream(body);
            }

            @Override
            public HttpHeaders getHeaders() {
                return input.getHeaders();
            }
        };
    }
}