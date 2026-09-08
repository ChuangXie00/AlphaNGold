package com.ang.backend.service.impl;

import com.ang.backend.exception.ResourceNotFoundException;
import com.ang.backend.repo.MyProjExpRepository;
import com.ang.backend.repo.model.MyProjExp;
import com.ang.backend.service.dto.in.MyProjExpInDTO;
import com.ang.backend.service.dto.out.MyProjExpOutDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MyProjExpServiceImplTest {

    @Mock
    private MyProjExpRepository repository;

    private MyProjExpServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MyProjExpServiceImpl(repository);
    }

    @Test
    void findAllReturnsRepositoryResultsAsDtos() {
        MyProjExp first = entity(1L, "项目一", "Project One", 1);
        MyProjExp second = entity(2L, "项目二", "Project Two", 2);
        when(repository.findAllByOrderByDisplayOrderAscIdAsc())
                .thenReturn(List.of(first, second));

        List<MyProjExpOutDTO> result = service.findAll();

        assertThat(result).containsExactly(toExpectedDto(first), toExpectedDto(second));
        verify(repository).findAllByOrderByDisplayOrderAscIdAsc();
    }

    @Test
    void findByIdReturnsMappedDto() {
        MyProjExp entity = entity(7L, "项目", "Project", 3);
        when(repository.findById(7L)).thenReturn(Optional.of(entity));

        assertThat(service.findById(7L)).isEqualTo(toExpectedDto(entity));
    }

    @Test
    void findByIdThrowsWhenEntityDoesNotExist() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("My project experience not found: 99");
    }

    @Test
    void createMapsInputAndDefaultsDisplayOrderToZero() {
        MyProjExpInDTO input = input(null);
        when(repository.save(org.mockito.ArgumentMatchers.any(MyProjExp.class)))
                .thenAnswer(invocation -> {
                    MyProjExp saved = invocation.getArgument(0);
                    saved.setId(10L);
                    saved.setCreatedAt(OffsetDateTime.of(2026, 9, 8, 12, 0, 0, 0, ZoneOffset.UTC));
                    saved.setUpdatedAt(saved.getCreatedAt());
                    return saved;
                });

        MyProjExpOutDTO result = service.create(input);

        ArgumentCaptor<MyProjExp> captor = ArgumentCaptor.forClass(MyProjExp.class);
        verify(repository).save(captor.capture());
        assertInputWasApplied(captor.getValue(), 0);
        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.displayOrder()).isZero();
    }

    @Test
    void updateAppliesInputToExistingEntity() {
        MyProjExp existing = entity(12L, "旧标题", "Old title", 9);
        MyProjExpInDTO input = input(4);
        when(repository.findById(12L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        MyProjExpOutDTO result = service.update(12L, input);

        assertInputWasApplied(existing, 4);
        assertThat(result.id()).isEqualTo(12L);
        assertThat(result.titleEn()).isEqualTo("AlphaNGold");
        verify(repository).save(existing);
    }

    @Test
    void updateThrowsAndDoesNotSaveWhenEntityDoesNotExist() {
        when(repository.findById(88L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(88L, input(1)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void deleteRemovesExistingEntity() {
        MyProjExp existing = entity(15L, "项目", "Project", 1);
        when(repository.findById(15L)).thenReturn(Optional.of(existing));

        service.delete(15L);

        verify(repository).delete(existing);
    }

    @Test
    void deleteThrowsAndDoesNotDeleteWhenEntityDoesNotExist() {
        when(repository.findById(16L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(16L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).delete(org.mockito.ArgumentMatchers.any());
    }

    private MyProjExpInDTO input(Integer displayOrder) {
        return new MyProjExpInDTO(
                "阿尔法金",
                "AlphaNGold",
                "中文简介",
                "English summary",
                "Java, Spring Boot, PostgreSQL",
                "https://example.com/alphangold",
                displayOrder
        );
    }

    private MyProjExp entity(Long id, String titleZh, String titleEn, Integer displayOrder) {
        OffsetDateTime createdAt = OffsetDateTime.of(2026, 9, 8, 10, 0, 0, 0, ZoneOffset.UTC);
        return MyProjExp.builder()
                .id(id)
                .titleZh(titleZh)
                .titleEn(titleEn)
                .summaryZh("中文简介")
                .summaryEn("English summary")
                .techStack("Java, Spring Boot")
                .projectUrl("https://example.com/project")
                .displayOrder(displayOrder)
                .createdAt(createdAt)
                .updatedAt(createdAt.plusMinutes(1))
                .build();
    }

    private MyProjExpOutDTO toExpectedDto(MyProjExp entity) {
        return new MyProjExpOutDTO(
                entity.getId(),
                entity.getTitleZh(),
                entity.getTitleEn(),
                entity.getSummaryZh(),
                entity.getSummaryEn(),
                entity.getTechStack(),
                entity.getProjectUrl(),
                entity.getDisplayOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private void assertInputWasApplied(MyProjExp entity, int expectedDisplayOrder) {
        assertThat(entity.getTitleZh()).isEqualTo("阿尔法金");
        assertThat(entity.getTitleEn()).isEqualTo("AlphaNGold");
        assertThat(entity.getSummaryZh()).isEqualTo("中文简介");
        assertThat(entity.getSummaryEn()).isEqualTo("English summary");
        assertThat(entity.getTechStack()).isEqualTo("Java, Spring Boot, PostgreSQL");
        assertThat(entity.getProjectUrl()).isEqualTo("https://example.com/alphangold");
        assertThat(entity.getDisplayOrder()).isEqualTo(expectedDisplayOrder);
    }
}
