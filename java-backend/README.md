# AlphaNGold Java Backend

Spring Boot API for project experiences, using Java 21, PostgreSQL 17, Spring Data JPA and Flyway.

## Local setup

Start PostgreSQL and create a database with a dedicated user. The example configuration uses `ang_dev` for both the database and user. Run the following from `java-backend`:

```powershell
if (-not (Test-Path -LiteralPath config/application-local.properties)) {
    Copy-Item -LiteralPath config/application-local.properties.example -Destination config/application-local.properties
}
```

Edit `config/application-local.properties` with your local connection details. This file is ignored by Git. Keep real passwords out of source files and terminal commands.

```properties
DATABASE_URL=jdbc:postgresql://localhost:5432/ang_dev
DATABASE_USERNAME=ang_dev
DATABASE_PASSWORD=replace_with_your_local_password
```

Spring Boot loads the external `config/application-local.properties` when started from this directory with the `local` profile. The same values can be supplied as process environment variables. The repository's `.env.example` is a reference template; Spring Boot does not automatically read a `.env` file.

## Build, test and run

From `java-backend`, run:

```powershell
.\mvnw.cmd clean package "-Dspring.profiles.active=local"
```

This runs the backend tests and builds the executable JAR. Integration tests require a running PostgreSQL database; their test records use transaction rollback. Use a separate test database when you need to isolate all database activity, including identity sequences and migrations.

Start the JAR from the same directory:

```powershell
java -jar target/java-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

The default port is 8080. Stop the process with `Ctrl+C`.

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
Invoke-RestMethod http://localhost:8080/api/v1/projects
```

Flyway creates the project table in an empty database. The current migration does not insert sample projects, so the project endpoint initially returns an empty list. Add your own records through the local project API when needed. Hibernate validates the schema; it does not create or update tables automatically.

## Frontend connection

Follow the [frontend setup instructions](../frontend/README.md). Set `VITE_API_BASE_URL=http://localhost:8080` in `frontend/.env.local`. The API client adds `/api/v1` endpoint paths.

Local CORS permits `http://localhost:5173` and `http://localhost:5174`. A different hostname or port is a different Origin.

## API and deployment boundary

The project API supports GET, POST, PUT and DELETE under `/api/v1/projects`. Write endpoints currently have no authentication and are intended for local development. Before public deployment, disable or protect these write endpoints and configure the production frontend Origin. CORS does not provide authentication.

`/api/v1/health` reports that the Java application can respond; it is not a database health check.
