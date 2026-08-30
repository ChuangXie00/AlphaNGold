package com.ang.backend.service.impl;

import com.ang.backend.exception.ResourceNotFoundException;
import com.ang.backend.repo.MyProjExpRepository;
import com.ang.backend.service.MyProjExpService;
import com.ang.backend.service.dto.in.MyProjExpInDTO;
import com.ang.backend.service.dto.out.MyProjExpOutDTO;
import com.ang.backend.repo.MyProjExpRepository;
import com.ang.backend.repo.model.MyProjExp;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyProjExpServiceImpl implements MyProjExpService {

    private final MyProjExpRepository myProjRepo;

    @Override
    public List<MyProjExpOutDTO> findAll() {
        return myProjRepo.findAllByOrderByDisplayOrderAscIdAsc()
                .stream()
                .map(this::toOutDTO)
                .toList();

    }

    @Override
    public MyProjExpOutDTO findById(Long id) {
        return toOutDTO(findEntityById(id));
    }

    @Override
    @Transactional
    public MyProjExpOutDTO create(MyProjExpInDTO inDTO) {
        MyProjExp entity = new MyProjExp();
        applyInput(entity, inDTO);

        return toOutDTO(myProjRepo.save(entity));
    }

    @Override
    @Transactional
    public MyProjExpOutDTO update(Long id, MyProjExpInDTO inDTO) {
        MyProjExp entity = findEntityById(id);
        applyInput(entity, inDTO);

        return toOutDTO(myProjRepo.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        MyProjExp entity = findEntityById(id);
        myProjRepo.delete(entity);
    }

    private MyProjExp findEntityById(Long id) {
        return myProjRepo.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException(
                        "My project experience not found: " + id
                ));
    }

    private void applyInput(MyProjExp entity, MyProjExpInDTO inDTO) {
        entity.setTitleZh(inDTO.titleZh());
        entity.setTitleEn(inDTO.titleEn());
        entity.setSummaryZh(inDTO.summaryZh());
        entity.setSummaryEn(inDTO.summaryEn());
        entity.setTechStack(inDTO.techStack());
        entity.setProjectUrl(inDTO.projectUrl());
        entity.setDisplayOrder(
                inDTO.displayOrder() == null ? 0 : inDTO.displayOrder()
        );
    }

    private MyProjExpOutDTO toOutDTO(MyProjExp entity) {
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
}
