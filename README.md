# ProEval AI

ProEval AI is an AI-assisted academic project evaluation platform for managing student project lifecycles, automated mentorship feedback, plagiarism and ownership risk signals, and technical viva preparation. It is designed for institutions that need a structured workflow from initial proposal submission through mid-term progress review and final project audit.

The system combines a Next.js student/admin portal with a FastAPI backend, PostgreSQL persistence, Redis/Celery background processing, and multi-agent AI evaluation services. 
Deployed link: https://pro-eval-ai.vercel.app/

## Key Features

- **Student project lifecycle**: Phase 1 proposal submission, Phase 2 progress tracking, and final project submission.
- **AI evaluation pipeline**: Ideator, Architect, Mentor, and Auditor-style evaluation flows for proposal quality, technical design, execution progress, and final readiness.
- **Admin dashboard**: Project coordinator views for students, projects, evaluation oversight, and institutional reporting.
- **Evaluation detail reports**: AI verdicts, scores, narratives, findings, recommendations, timelines, and ownership-risk summaries.
- **Plagiarism and integrity signals**: Risk indicators such as similarity, style shift, code jump, AI-generated concerns, and contribution mismatch.
- **Team management**: Student teams, roles, module ownership, and individual contribution records.
- **Background evaluation queue**: Celery workers process longer-running AI and GitHub analysis tasks outside the request cycle.
- **Integration-ready architecture**: REST API, GitHub code context ingestion, LangSmith tracing support, and ElevenLabs integration hooks.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/radix UI |
| Backend | FastAPI, SQLAlchemy 2, Pydantic, Alembic |
| Database | PostgreSQL |
| Queue / Cache | Redis, Celery |
| AI Providers | Google Gemini, Anthropic, OpenAI-compatible support |
| Evaluation Tooling | Custom multi-agent services, GitHub repository code analysis |
| Testing | ESLint, TypeScript checks, Playwright E2E tests, backend test scripts |
| Deployment Support | Docker Compose for PostgreSQL, Redis, backend, and worker |

## Repository Structure

```text
ProEval_ai/
|-- backend/
|   |-- app/
|   |   |-- agents/              # AI agent implementations
|   |   |-- api/                 # FastAPI routers, schemas, dependencies
|   |   |-- core/                # Config, security, AI provider utilities
|   |   |-- db/                  # SQLAlchemy models and session setup
|   |   |-- evaluation_heuristics/
|   |   |-- services/            # Business logic and evaluation orchestration
|   |   `-- tasks/               # Celery app and background evaluation tasks
|   |-- alembic/                 # Database migrations
|   `-- requirements.txt
|-- ProEval_Frontend/
|   |-- src/
|   |   |-- app/                 # Next.js app routes
|   |   |-- components/          # Shared UI and feature components
|   |   |-- context/             # Auth and app context
|   |   |-- lib/                 # API clients and utilities
|   |   `-- types/               # Shared TypeScript types
|   `-- package.json
|-- docker-compose.yml
`-- README.md
```

## Prerequisites

- Node.js 20 or newer
- Python 3.11 or newer
- PostgreSQL 16 or compatible
- Redis 7 or compatible
- Git
- API keys for the AI providers you intend to use

Docker is optional, but recommended for local PostgreSQL and Redis.

## Environment Configuration

Create backend and frontend environment files before starting the app.

### Backend

Copy the example file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Important backend variables:

```env
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/proeval
JWT_SECRET=replace-with-a-long-random-secret

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

ANTHROPIC_API_KEY=
GITHUB_PERSONAL_ACCESS_TOKEN=
ELEVENLABS_WEBHOOK_SECRET=
```

Never commit real secrets, database credentials, or provider keys.

### Frontend

Create `ProEval_Frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/Minion-tech/ProEval_ai.git
cd ProEval_ai
```

### 2. Start PostgreSQL and Redis

Using Docker Compose:

```bash
docker compose up -d postgres redis
```

Or run PostgreSQL and Redis locally and update `DATABASE_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND`.

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Apply database migrations:

```bash
alembic upgrade head
```

Run the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:

- `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`

### 4. Start the Celery worker

In a second terminal:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
celery -A app.tasks.celery_app.celery_app worker --loglevel=info --concurrency=3
```

Use the equivalent virtual environment activation command on macOS/Linux.

### 5. Set up the frontend

In another terminal:

```bash
cd ProEval_Frontend
npm install
npm run dev
```

The frontend will be available at:

- `http://127.0.0.1:3000`

## Docker Compose Development

The repository includes a Docker Compose file for PostgreSQL, Redis, backend API, and Celery worker:

```bash
docker compose up --build
```

Services:

- Frontend: run separately with `npm run dev`
- Backend API: `http://127.0.0.1:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Before production use, replace the example Docker environment values with secure secrets.

## Common Commands

### Frontend

```bash
cd ProEval_Frontend
npm run dev       # Start local Next.js development server
npm run build     # Build production frontend
npm run start     # Start production frontend
npm run lint      # Run ESLint
npm run test:e2e  # Run Playwright tests
```

### Backend

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
alembic upgrade head
alembic revision --autogenerate -m "describe migration"
celery -A app.tasks.celery_app.celery_app worker --loglevel=info --concurrency=3
```

## Core User Flows

### Student Flow

1. Register or log in.
2. Submit a Phase 1 project proposal.
3. Review AI mentorship feedback and clarification requests.
4. Form or join a team.
5. Submit Phase 2 progress with repository and presentation references.
6. Submit final report, demo, repository, and individual contribution details.
7. Review AI feedback, roadmap, and viva preparation outputs.

### Admin / Project Coordinator Flow

1. View institution-level dashboard metrics.
2. Manage students and project records.
3. Monitor all project submissions.
4. Review AI evaluations across phases.
5. Open detailed evaluation reports with summary and plagiarism-risk tabs.
6. Use evaluation evidence to support project oversight and academic review.

## API Overview

The backend exposes REST endpoints under `/api/v1`.

Important route groups:

- `/api/v1/auth` - authentication and current user profile
- `/api/v1/projects` - student project submission, team, and evaluation access
- `/api/v1/admin` - coordinator/admin dashboards, projects, users, and evaluations
- `/api/v1/test-projects` - test-mode project workflows
- `/api/v1/interview` - viva/interview-related flows
- `/api/v1/integrations` - webhook and external integration hooks

OpenAPI documentation is available at `/docs` when the backend is running.

## Evaluation Pipeline

ProEval AI stores one or more evaluation records per project phase:

- **Phase 1**: proposal originality, feasibility, clarifications, and architecture readiness.
- **Phase 2**: execution progress, GitHub/code context review, milestone health, and ownership-risk signals.
- **Final**: final readiness, implementation completeness, contribution evidence, and audit-style recommendations.

Evaluation records include:

- phase and status
- total score or grade where available
- AI narrative
- structured agent logs
- findings and recommendations
- timeline or roadmap data
- plagiarism and ownership-risk indicators

Long-running evaluation work is processed by Celery workers so the API remains responsive.

## Troubleshooting

### Frontend cannot connect to the API

If the frontend shows:

```text
Unable to connect to API at http://127.0.0.1:8000/api/v1
```

Start the backend:

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then confirm the API responds at `http://127.0.0.1:8000/docs`.

### Evaluations stay pending

Make sure Redis and the Celery worker are running:

```bash
docker compose up -d redis
cd backend
celery -A app.tasks.celery_app.celery_app worker --loglevel=info --concurrency=3
```

### Database connection fails

Check that PostgreSQL is running and that `DATABASE_URL` matches your local credentials. After changing the database connection, rerun:

```bash
alembic upgrade head
```

### AI evaluation fails

Check:

- `GEMINI_API_KEY` is configured.
- `GEMINI_MODEL` is available for the key being used.
- The backend worker has access to the same environment variables as the API.
- Provider quota and rate limits are not exhausted.

## Security Notes

- Store secrets in `.env` files or a secrets manager, not in source control.
- Rotate `JWT_SECRET` and AI provider keys for production deployments.
- Restrict CORS origins to trusted frontend URLs outside local development.
- Use least-privilege GitHub tokens if repository analysis is enabled.
- Review generated AI feedback before using it for formal academic decisions.

## Contributing

1. Create a feature branch from the latest main branch.
2. Keep changes scoped and documented.
3. Run frontend linting and relevant backend checks before opening a pull request.
4. Include screenshots or API examples for user-facing changes.
5. Add or update tests when changing shared behavior, authentication, evaluation logic, or data contracts.


## Maintainers

ProEval AI Team
