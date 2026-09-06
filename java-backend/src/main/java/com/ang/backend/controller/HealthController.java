package com.ang.backend.controller;

import com.ang.backend.controller.vo.ApiResponseOutVO;
import com.ang.backend.controller.vo.out.HealthOutVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ApiResponseOutVO<HealthOutVO> health() {
        return ApiResponseOutVO.success(
                new HealthOutVO(
                        "up",
                        "alphangold-java-backend"
                )
        );
    }
}
