package com.ang.backend.controller.vo.out;

import java.util.Map;

public record ErrorOutVO(
        String code,
        String message,
        Map<String, String> details
) { }
