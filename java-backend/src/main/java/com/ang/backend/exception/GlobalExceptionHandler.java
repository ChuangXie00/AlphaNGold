package com.ang.backend.exception;


import com.ang.backend.controller.vo.ApiResponseOutVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.springframework.web.ErrorResponse;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponseOutVO<Void>> handleNotFound(
            ResourceNotFoundException ex
    ) {
        return buildResponse(
                HttpStatus.NOT_FOUND,
                "RESOURCE_NOT_FOUND",
                ex.getMessage(),
                Map.of()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponseOutVO<Void>> handleValidation(
            MethodArgumentNotValidException ex
    ) {
        Map<String, String> details = new LinkedHashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error -> details.putIfAbsent(
                        error.getField(),
                        error.getDefaultMessage()
                ));

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Request validation failed",
                details
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponseOutVO<Void>> handleUnreadableMessage(
            HttpMessageNotReadableException ex
    ) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST_BODY",
                "Request body is missing or invalid",
                Map.of()
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponseOutVO<Void>> handleDataIntegrity(
            DataIntegrityViolationException ex
    ) {
        log.warn("Database constraint violation; type={}",
                ex.getClass().getSimpleName());

        return buildResponse(
                HttpStatus.CONFLICT,
                "DATA_INTEGRITY_ERROR",
                "The request conflicts with existing data",
                Map.of()
        );
    }

    // TODO: 引入auth或更多业务错误后，按具体异常或业务错误码区分原因，不再仅凭 HTTP 状态码分类，尤其不能把所有 403 都映射为 WRITE_DISABLED。调整时同步更新前端错误提示及测试，保留统一响应结构。
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponseOutVO <Void>> handleResponseStatus(
            ResponseStatusException ex
    ) {
        int status = ex.getStatusCode().value();

        String code = switch (status) {
            case 403 -> "WRITE_DISABLED";
            case 413 -> "PAYLOAD_TOO_LARGE";
            case 429 -> "RATE_LIMITED";
            case 503 -> "SERVICE_UNAVAILABLE";
            default -> "REQUEST_REJECTED";
        };

        String message = switch (status) {
            case 403 -> "Write operations are disabled";
            case 413 -> "Request body is too large";
            case 429 -> "Too many requests. Please try again later";
            case 503 -> "The service is temporarily unavailable";
            default -> "The request was rejected";
        };

        return ResponseEntity
                .status(ex.getStatusCode())
                .headers(ex.getHeaders())
                .body(ApiResponseOutVO.<Void>failure(
                        code,
                        message,
                        Map.of()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponseOutVO<Void>> handleUnexpected(
            Exception ex
    ) {
        // 保留框架产生的404、405、415。
        if (ex instanceof ErrorResponse error
                && error.getStatusCode().is4xxClientError()) {
            return ResponseEntity
                    .status(error.getStatusCode())
                    .headers(error.getHeaders())
                    .body(ApiResponseOutVO.<Void>failure(
                            "REQUEST_REJECTED",
                            "The request was rejected",
                            Map.of()
                    ));
        }

        log.error("Unexpected server error; type={}",
                ex.getClass().getSimpleName());

        return buildResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                "An unexpected server error occurred",
                Map.of()
        );
    }

    private ResponseEntity<ApiResponseOutVO<Void>> buildResponse(
            HttpStatus status,
            String code,
            String message,
            Map<String, String> details
    ) {
        return ResponseEntity
                .status(status)
                .body(ApiResponseOutVO.failure(
                        code,
                        message,
                        details
                ));
    }
}
