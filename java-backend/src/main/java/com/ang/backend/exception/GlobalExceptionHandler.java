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
        log.warn("Database constraint violation", ex);

        return buildResponse(
                HttpStatus.CONFLICT,
                "DATA_INTEGRITY_ERROR",
                "The request conflicts with existing data",
                Map.of()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponseOutVO<Void>> handleUnexpected(
            Exception ex
    ) {
        log.error("Unexpected server error", ex);

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
