from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import prices, dividends, search

app = FastAPI(
    title="Market Data Service",
    description="Fetches historical price and dividend data",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registering the routers for price and dividend endpoints
app.include_router(prices.router, tags=["Prices"])
app.include_router(dividends.router, tags=["Dividends"])
app.include_router(search.router, tags=["Search"])

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy", "service": "market-data"}
