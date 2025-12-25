# Backtesting Platform

A microservices-based trading strategy backtesting platform with a React testing dashboard.

## Quick Start

```bash
# Build and run all services
docker-compose up --build

# Open the testing dashboard
open http://localhost:8010
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 8010 | React testing dashboard |
| Orchestrator | 8011 | API gateway, coordinates all services |
| Market Data | 8012 | Fetches price/dividend data |
| Strategy | 8013 | Generates buy/sell signals |
| Portfolio | 8014 | Simulates trade execution |
| Metrics | 8015 | Calculates performance metrics |
| Test Data Fetcher | 8016 | Provides sample data for testing |

## Testing Dashboard

The frontend provides two views:

- **Dashboard**: Monitor service health and endpoint status in real-time
- **Testing Lab**: Manually test endpoints with custom payloads

## Technology Stack

- **Backend**: Python 3.11, FastAPI
- **Frontend**: React 18, TypeScript, Vite
- **Data**: yfinance (Yahoo Finance API)
- **Infrastructure**: Docker, Docker Compose
