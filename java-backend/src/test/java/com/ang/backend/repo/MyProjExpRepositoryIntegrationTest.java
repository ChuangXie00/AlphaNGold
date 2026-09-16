package com.ang.backend.repo;

import com.ang.backend.repo.model.MyProjExp;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("local")
@Transactional
class MyProjExpRepositoryIntegrationTest {

    @Autowired
    private MyProjExpRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywayMigrationCreatedExpectedTableSuccessfully() {
        Boolean tableExists = jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.my_proj_exp') IS NOT NULL",
                Boolean.class
        );
        Integer successfulMigrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '0001' AND success",
                Integer.class
        );

        assertThat(tableExists).isTrue();
        assertThat(successfulMigrationCount).isEqualTo(1);
    }

    @Test
    void savesFindsUpdatesAndDeletesEntity() {
        MyProjExp entity = newEntity("集成测试项目", "Integration Test Project", 7001);

        MyProjExp saved = repository.saveAndFlush(entity);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(repository.findById(saved.getId())).contains(saved);

        saved.setTitleEn("Updated Integration Test Project");
        MyProjExp updated = repository.saveAndFlush(saved);
        assertThat(updated.getTitleEn()).isEqualTo("Updated Integration Test Project");
        assertThat(updated.getUpdatedAt()).isNotNull();

        repository.delete(updated);
        repository.flush();
        assertThat(repository.findById(updated.getId())).isEmpty();
    }

    @Test
    void customQueryLimitsResultsAndOrdersByDisplayOrderThenId() {
        repository.saveAndFlush(newEntity("排序测试一", "Ordering Test One", 7003));
        repository.saveAndFlush(newEntity("排序测试二", "Ordering Test Two", 7002));
        repository.saveAndFlush(newEntity("排序测试三", "Ordering Test Three", 7002));

        List<MyProjExp> result = repository.findAllByOrderByDisplayOrderAscIdAsc(Limit.of(2));

        Comparator<MyProjExp> expectedOrder = Comparator
                .comparing(MyProjExp::getDisplayOrder)
                .thenComparing(MyProjExp::getId);
        assertThat(result).hasSize(2).isSortedAccordingTo(expectedOrder);
    }

    @ParameterizedTest
    @CsvSource({
            "zh, chk_my_proj_exp_summary_zh_length",
            "en, chk_my_proj_exp_summary_en_length"
    })
    void databaseRejectsOversizedSummary(String language, String constraintName) {
        MyProjExp project = newEntity("长度测试", "Length Test", 7004);

        if ("zh".equals(language)) {
            project.setSummaryZh("测".repeat(1501));
        } else {
            project.setSummaryEn("x".repeat(1501));
        }

        assertThatThrownBy(() -> repository.saveAndFlush(project))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining(constraintName);
    }

    private MyProjExp newEntity(String titleZh, String titleEn, int displayOrder) {
        return MyProjExp.builder()
                .titleZh(titleZh)
                .titleEn(titleEn)
                .summaryZh("仅用于事务回滚的集成测试")
                .summaryEn("Integration test data rolled back after the test")
                .techStack("Java, Spring Boot, PostgreSQL")
                .projectUrl("https://example.com/integration-test")
                .displayOrder(displayOrder)
                .build();
    }
}
