package com.ang.backend.service.dto.out;

import java.time.OffsetDateTime;

public record MyProjExpOutDTO(
        Long id,
        String titleZh,
        String titleEn,
        String summaryZh,
        String summaryEn,
        String techStack,
        String projectUrl,
        Integer displayOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
