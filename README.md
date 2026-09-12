# AlphaNGold

AlphaNGold is a personal full-stack platform combining a personal homepage, an AI assistant, and a gold market dashboard.

## Project Status

The project is currently in Phase 1: environment setup and foundational project initialization.

Current progress:

- React frontend initialized
- Spring Boot backend initialized
- PostgreSQL local database configured
- Maven build and tests verified
- Python/FastAPI backend planned for a later stage

## Project Structure

```
AlphaNGold/
├── frontend/           # React frontend
├── java-backend/       # Spring Boot backend
├── .env.example        # Environment variable template
├── .gitattributes      # Git line-ending rules
├── .gitignore          # Git ignore rules
└── README.md           # Project overview
```

The `python-backend/` directory will be added when development of the Python/FastAPI service begins.

## Main Modules

### Main

Personal homepage and project entry point.

### AI Assistant

Conversational AI features, with future support for RAG and Agent workflows.

### Gold Dashboard

Gold price visualization, market indicators, historical analysis, and generated reports.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite

### Java Backend

- Java 21
- Spring Boot
- Maven
- Spring Data JPA
- Flyway

### Python Backend

- Python
- FastAPI
- AI, RAG, and Agent services

### Database

- PostgreSQL

## Local Environment

For runnable setup, test and startup commands, see the [frontend guide](frontend/README.md) and [Java backend guide](java-backend/README.md). Start PostgreSQL, then the Java backend, then the frontend.

Copy the environment variable template when local environment files are needed:

```
Copy-Item .env.example .env
```

Never commit real passwords, API keys, or other secrets.

## Development

Each subproject is developed and run from its own directory:

```
frontend/
java-backend/
python-backend/   # Planned
```

The Git repository is managed uniformly from the `AlphaNGold` root directory.

## Git Workflow

The main branch is:

```
main
```

New work should normally be developed on feature branches and merged into `main` after verification.

## License

No license has been selected yet.
