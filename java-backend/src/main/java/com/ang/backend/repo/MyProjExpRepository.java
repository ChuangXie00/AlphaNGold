package com.ang.backend.repo;

import com.ang.backend.repo.model.MyProjExp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MyProjExpRepository extends JpaRepository<MyProjExp, Long> {

    List<MyProjExp> findAllByOrderByDisplayOrderAscIdAsc();

}
