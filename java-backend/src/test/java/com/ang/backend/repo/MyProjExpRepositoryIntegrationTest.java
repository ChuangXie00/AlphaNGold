package com.ang.backend.repo;

import com.ang.backend.repo.model.MyProjExp;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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
    void customQueryOrdersByDisplayOrderThenId() {
        repository.saveAndFlush(newEntity("排序测试一", "Ordering Test One", 7003));
        repository.saveAndFlush(newEntity("排序测试二", "Ordering Test Two", 7002));

        List<MyProjExp> result = repository.findAllByOrderByDisplayOrderAscIdAsc();

        Comparator<MyProjExp> expectedOrder = Comparator
                .comparing(MyProjExp::getDisplayOrder)
                .thenComparing(MyProjExp::getId);
        assertThat(result).isSortedAccordingTo(expectedOrder);
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
