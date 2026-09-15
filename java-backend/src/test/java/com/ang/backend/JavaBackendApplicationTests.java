package com.ang.backend;

import com.ang.backend.config.WebConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
class JavaBackendApplicationTests {

    @Test
    void contextLoads() {
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "prod | app.write-enabled=true | Write operations must be disabled in prod",
            "prod | WRITE_ENABLED=true | Write operations must be disabled in prod",
            "local,prod | app.write-enabled=false | Profiles local and prod must not be combined",
            "prod,local | app.write-enabled=false | Profiles local and prod must not be combined",
            "prod,local | app.write-enabled=true | Profiles local and prod must not be combined"
    })
    void rejectsUnsafeConfigurationBeforeSingletonInitialization(
            String profiles, String writeProperty, String expectedMessage
    ) {
        AtomicBoolean initialized = new AtomicBoolean();

        configurationRunner(profiles, initialized)
                .withPropertyValues(writeProperty)
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessage(expectedMessage);
                    assertThat(initialized).isFalse();
                });
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "local | app.write-enabled=true",
            "local | app.write-enabled=false",
            "prod | app.write-enabled=false",
            "prod,metrics | app.write-enabled=false"
    })
    void permitsSafeConfiguration(String profiles, String writeProperty) {
        AtomicBoolean initialized = new AtomicBoolean();

        configurationRunner(profiles, initialized)
                .withPropertyValues(writeProperty)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(initialized).isTrue();
                });
    }

    private ApplicationContextRunner configurationRunner(
            String profiles, AtomicBoolean initialized
    ) {
        return new ApplicationContextRunner()
                .withInitializer(context ->
                        context.getEnvironment().setActiveProfiles(profiles.split(",")))
                .withUserConfiguration(WebConfig.class)
                .withPropertyValues(
                        "app.cors.allowed-origins=https://www.alphangold.com",
                        "app.write-enabled=${WRITE_ENABLED:false}"
                )
                .withBean("initializationProbe", Object.class, () -> {
                    initialized.set(true);
                    return new Object();
                });
    }

}
