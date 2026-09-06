package com.ang.backend.controller;


import com.ang.backend.controller.vo.ApiResponseOutVO;
import com.ang.backend.controller.vo.in.MyProjExpInVO;
import com.ang.backend.controller.vo.out.MyProjExpOutVO;
import com.ang.backend.service.MyProjExpService;
import com.ang.backend.service.dto.in.MyProjExpInDTO;
import com.ang.backend.service.dto.out.MyProjExpOutDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class MyProjExpController {
    private final MyProjExpService myProjExpService;

    @GetMapping
    public ApiResponseOutVO< List<MyProjExpOutVO>> findAll() {
        List<MyProjExpOutVO> projects = myProjExpService.findAll()
                .stream()
                .map(this::toOutVO)
                .toList();

        return ApiResponseOutVO.success(projects);
    }

    @GetMapping("/{id}")
    public ApiResponseOutVO<MyProjExpOutVO> findById(
            @PathVariable Long id
    ) {
        return ApiResponseOutVO.success(
                toOutVO(myProjExpService.findById(id))
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponseOutVO<MyProjExpOutVO>> create(
            @Valid @RequestBody MyProjExpInVO in
            ) {
        MyProjExpOutVO created = toOutVO(
                myProjExpService.create(toInDTO(in))
        );

        // TODO     should consider about create failed
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponseOutVO.success(created));
    }

    @PutMapping("/{id}")
    public ApiResponseOutVO<MyProjExpOutVO> update(
            @PathVariable Long id,
            @Valid @RequestBody MyProjExpInVO in
    ) {
        // TODO     should consider about update failed
        return ApiResponseOutVO.success(
                toOutVO(myProjExpService.update(id, toInDTO(in)))
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponseOutVO<Void> delete(
          @PathVariable Long id
    ) {
        myProjExpService.delete(id);
        // TODO     should consider about delete failed
        return ApiResponseOutVO.emptySuccess();
    }

    private MyProjExpInDTO toInDTO(MyProjExpInVO inVO) {
        return new MyProjExpInDTO(
                inVO.titleZh(),
                inVO.titleEn(),
                inVO.summaryZh(),
                inVO.summaryEn(),
                inVO.techStack(),
                inVO.projectUrl(),
                inVO.displayOrder()
        );
    }

    private MyProjExpOutVO toOutVO(MyProjExpOutDTO out) {
        return new MyProjExpOutVO(
                out.id(),
                out.titleZh(),
                out.titleEn(),
                out.summaryZh(),
                out.summaryEn(),
                out.techStack(),
                out.projectUrl(),
                out.displayOrder(),
                out.createdAt(),
                out.updatedAt()
        );
    }
}
