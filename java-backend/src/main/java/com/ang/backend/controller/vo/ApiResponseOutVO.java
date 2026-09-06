package com.ang.backend.controller.vo;

import com.ang.backend.controller.vo.out.ErrorOutVO;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

public record ApiResponseOutVO<T>(
        boolean success,
        T data,
        ErrorOutVO error,
        OffsetDateTime timestamp
) {
    public static <T> ApiResponseOutVO<T> success(T data) {
        return new ApiResponseOutVO<>(
                true,
                data,
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }

    public static ApiResponseOutVO<Void> emptySuccess() {
        return new ApiResponseOutVO<>(
                true,
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }

    public static <T> ApiResponseOutVO<T> failure(
            String code,
            String message,
            Map<String, String> details
    ) {
        return new ApiResponseOutVO<>(
                false,
                null,
                new ErrorOutVO(code, message, details),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
