package com.ang.backend.controller.vo.in;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record MyProjExpInVO(
        @NotBlank
        @Size(max = 200)
        String titleZh,

        @NotBlank
        @Size(max = 200)
        String titleEn,

        @NotBlank
        @Size(max = 1500)
        String summaryZh,

        @NotBlank
        @Size(max = 1500)
        String summaryEn,

        @NotBlank
        @Size(max = 500)
        String techStack,

        @Size(max = 500)
        String projectUrl,

        @PositiveOrZero
        Integer displayOrder
) {}
