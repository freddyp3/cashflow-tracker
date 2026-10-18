package org.example;

import java.nio.file.Path;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * Base class for integration tests that need a real PostgreSQL database.
 *
 * <p>Starts one shared Testcontainers postgres:16-alpine container for the
 * whole test JVM (static initializer, so it stays up across test classes and
 * the shared application context) and initialises it with the canonical
 * schema + analytics views from {@code app/database/*.sql} via
 * {@code /docker-entrypoint-initdb.d/}. {@link ServiceConnection} wires the
 * datasource automatically, and
 * {@code spring.jpa.hibernate.ddl-auto=validate} still validates entities
 * against the real schema.</p>
 */
@SpringBootTest
public abstract class AbstractPostgresIT {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withCopyFileToContainer(
                    MountableFile.forHostPath(Path.of("database", "create_tables.sql")),
                    "/docker-entrypoint-initdb.d/01-tables.sql")
            .withCopyFileToContainer(
                    MountableFile.forHostPath(Path.of("database", "create_views.sql")),
                    "/docker-entrypoint-initdb.d/02-views.sql");

    static {
        postgres.start();
    }
}
