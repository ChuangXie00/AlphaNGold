package com.ang.backend.controller.vo.out;

import java.time.OffsetDateTime;

public record MyProjExpOutVO(
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
