# Backtesting Platform

A microservices-based trading strategy backtesting platform built with Python/FastAPI and React.

---

## Architecture

```
                                ┌──────────────────┐
                                │     Frontend     │
                                │    (React)       │
                                │     :8010        │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │   Orchestrator   │
                                │     :8011        │
                                └────────┬─────────┘
                                         │
            ┌───────────────┬────────────┼────────────┬───────────────┐
            │               │            │            │               │
            ▼               ▼            ▼            ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Market Data  │ │   Strategy   │ │  Portfolio   │ │   Metrics    │
    │    :8012     │ │    :8013     │ │    :8014     │ │    :8015     │
    └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

See `ARCHITECTURE.md` for complete service contracts and data flow documentation.

---

## Quick Start

```bash
# Build and run all services
docker-compose up --build

# Open the testing dashboard
open http://localhost:8010
```

The dashboard shows service health and endpoint status. Use the Testing Lab to manually test endpoints.

---

## DO NOT MODIFY

The following files and folders are **infrastructure** and should not be modified:

| Path | Reason |
|------|--------|
| `docker-compose.yml` | Service configuration is finalized |
| `.env.example` | Environment template is set |
| `frontend/` | Testing dashboard - separate development track |
| `services/test-data-fetcher/` | Complete reference implementation |

If you need changes to these files, raise it with the team lead first.

---

## Service Implementation Status

Each service has an `INSTRUCTIONS.md` file with complete implementation details.

| Service | Port | Status | Instructions |
|---------|------|--------|--------------|
| **orchestrator** | 8011 | Skeleton | [INSTRUCTIONS.md](services/orchestrator/INSTRUCTIONS.md) |
| **market-data** | 8012 | Skeleton | [INSTRUCTIONS.md](services/market-data/INSTRUCTIONS.md) |
| **strategy** | 8013 | Skeleton | [INSTRUCTIONS.md](services/strategy/INSTRUCTIONS.md) |
| **portfolio** | 8014 | Skeleton | [INSTRUCTIONS.md](services/portfolio/INSTRUCTIONS.md) |
| **metrics** | 8015 | Skeleton | [INSTRUCTIONS.md](services/metrics/INSTRUCTIONS.md) |
| test-data-fetcher | 8016 | Complete | Reference implementation |
| frontend | 8010 | Complete | Testing dashboard |

**Skeleton** = Only `/health` endpoint implemented. Read the INSTRUCTIONS.md to see what needs to be built.

---

## Development Workflow

### Running All Services (Recommended)

```bash
docker-compose up --build
```

Changes to Python files trigger automatic reload inside containers.

### Running a Single Service Locally

```bash
cd services/<service-name>
pip install -r requirements.txt
uvicorn app.main:app --reload --port <port>
```

Useful for faster iteration, but other services must be running via Docker.

### Running Tests

```bash
cd services/<service-name>
pytest tests/
```

---

## Directory Structure

```
backtesting/
├── README.md              # This file
├── ARCHITECTURE.md        # Complete API specifications
├── docker-compose.yml     # DO NOT MODIFY
├── .env.example           # DO NOT MODIFY
│
├── services/
│   ├── orchestrator/      # YOUR WORK: API gateway
│   │   ├── INSTRUCTIONS.md
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │
│   ├── market-data/       # YOUR WORK: Price/dividend fetcher
│   │   ├── INSTRUCTIONS.md
│   │   └── ...
│   │
│   ├── strategy/          # YOUR WORK: Signal generation
│   │   ├── INSTRUCTIONS.md
│   │   └── ...
│   │
│   ├── portfolio/         # YOUR WORK: Trade simulation
│   │   ├── INSTRUCTIONS.md
│   │   └── ...
│   │
│   ├── metrics/           # YOUR WORK: Performance calculations
│   │   ├── INSTRUCTIONS.md
│   │   └── ...
│   │
│   └── test-data-fetcher/ # DO NOT MODIFY - reference implementation
│
└── frontend/              # DO NOT MODIFY - testing dashboard
```

---

## Git Workflow

### Commits

- Write clear, descriptive commit messages
- Keep commits focused on single changes
- Reference issue numbers if applicable

### Branches

- Create feature branches from `main`
- Use descriptive branch names: `feature/market-data-prices`, `fix/portfolio-dividend-calc`
- Keep PRs focused and reviewable

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11, FastAPI, Pydantic |
| Market Data | yfinance (Yahoo Finance API) |
| Frontend | React 18, TypeScript, Vite |
| Infrastructure | Docker, Docker Compose |

---

## Need Help?

1. Read the service's `INSTRUCTIONS.md` first
2. Check `ARCHITECTURE.md` for API contracts
3. Look at `services/test-data-fetcher/app/main.py` as a working example
4. Ask the team lead if still stuck
