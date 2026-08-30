package com.ang.backend.service;

import com.ang.backend.service.dto.in.MyProjExpInDTO;
import com.ang.backend.service.dto.out.MyProjExpOutDTO;

import java.util.List;

public interface MyProjExpService {

    List<MyProjExpOutDTO> findAll();

    MyProjExpOutDTO findById(Long id);

    MyProjExpOutDTO create(MyProjExpInDTO inDTO);

    MyProjExpOutDTO update(Long id, MyProjExpInDTO inDTO);

    void delete(Long id);
}
