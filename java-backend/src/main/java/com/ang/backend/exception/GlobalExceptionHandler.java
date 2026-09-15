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

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponseOutVO <Void>> handleResponseStatus(
            ResponseStatusException ex
    ) {
        boolean forbidden = ex.getStatusCode().value() == 403;

        return ResponseEntity
                .status(ex.getStatusCode())
                .headers(ex.getHeaders())
                .body(ApiResponseOutVO.<Void>failure(
                        forbidden ? "WRITE_DISABLED" : "REQUEST_REJECTED",
                        forbidden
                                ? "Write operations are disabled"
                                : "The request was rejected",
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
