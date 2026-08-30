package com.ang.backend.repo.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;


@Entity
@Table(name = "my_proj_exp")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyProjExp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titleZh;

    @Column(nullable = false, length = 200)
    private String titleEn;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summaryZh;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summaryEn;

    @Column(nullable = false, length = 500)
    private String techStack;

    @Column(length = 500)
    private String projectUrl;

    @Column(nullable = false)
    private Integer displayOrder;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        if (displayOrder == null) {
            displayOrder = 0;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
