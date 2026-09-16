package com.ang.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.handler.MappedInterceptor;

import java.net.URI;
import java.util.Arrays;
import java.util.Locale;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    // Run before data source initialization and Flyway migration.
    @Bean
    static BeanFactoryPostProcessor validateProductionWriteConfiguration(
            Environment environment
    ) {
        return beanFactory -> {
            if (!environment.acceptsProfiles(Profiles.of("prod"))) {
                return;
            }
            if (environment.acceptsProfiles(Profiles.of("local"))) {
                throw new IllegalStateException("Profiles local and prod must not be combined");
            }
            if (environment.getProperty("app.write-enabled", Boolean.class, false)) {
                throw new IllegalStateException("Write operations must be disabled in prod");
            }
        };
    }

    public WebConfig(
            @Value("${app.cors.allowed-origins:}") String origins,
            Environment environment
    ) {
        this.allowedOrigins = Arrays.stream(origins.split(",", -1))
                .map(String::trim)
                .toArray(String[]::new);

        boolean production =
                environment.acceptsProfiles(Profiles.of("prod"));

        for (String origin : allowedOrigins) {
            validateOrigin(origin, production);
        }
    }

    private static void validateOrigin(
            String origin,
            boolean production
    ) {
        URI uri;

        try {
            uri = URI.create(origin);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(
                    "Invalid app.cors.allowed-origins"
            );
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();

        boolean valid = !origin.isBlank()
                && !origin.contains("*")
                && ("http".equals(scheme) || "https".equals(scheme))
                && host != null
                && uri.getRawUserInfo() == null
                && "".equals(uri.getRawPath())
                && uri.getRawQuery() == null
                && uri.getRawFragment() == null
                && (uri.getPort() == -1
                || (uri.getPort() >= 1 && uri.getPort() <= 65535));

        if (!valid) {
            throw new IllegalStateException(
                    "CORS origins must contain only scheme, host and optional port"
            );
        }

        if (production) {
            String normalizedHost = host.toLowerCase(Locale.ROOT);

            boolean localHost = normalizedHost.equals("localhost")
                    || normalizedHost.endsWith(".localhost")
                    || normalizedHost.startsWith("127.")
                    || normalizedHost.equals("0.0.0.0")
                    || normalizedHost.contains(":");

            if (!"https".equals(scheme) || localHost) {
                throw new IllegalStateException(
                        "Production CORS requires HTTPS domain origins"
                );
            }
        }
    }

    // TODO: 替换请求保护实现时，同步调整此处注册、相关配置及测试。
    // 如果仅将限流迁移到网关，不要连带删除仍需保留的其他请求保护。
    @Bean
    static MappedInterceptor apiRequestLimits(Environment environment) {
        return new MappedInterceptor(
                new String[]{"/api/**"},
                new ApiRequestInterceptor(
                        environment.getProperty(
                                "app.rate-limit.enabled", Boolean.class, false
                        ),
                        environment.getProperty(
                                "app.rate-limit.burst", Integer.class, 10
                        ),
                        environment.getProperty(
                                "app.rate-limit.per-second", Double.class, 1.0
                        ),
                        environment.getProperty(
                                "app.rate-limit.max-clients", Integer.class, 10000
                        ),
                        environment.getProperty(
                                "app.rate-limit.idle-seconds", Long.class, 600L
                        )
                )
        );
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods(
                        "GET",
                        "HEAD",
                        "POST",
                        "PUT",
                        "DELETE",
                        "OPTIONS"
                )
                .allowedHeaders("*")
                .allowCredentials(false);
    }
}
