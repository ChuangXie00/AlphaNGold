package com.ang.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

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
