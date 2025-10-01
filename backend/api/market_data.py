"""
Market data routes using Alpha Vantage API
"""

from typing import Dict, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.alpha_vantage_client import AlphaVantageClient

router = APIRouter(prefix="/api/market-data", tags=["market-data"])

# Shared client instance
client: Optional[AlphaVantageClient] = None

async def get_client() -> AlphaVantageClient:
    """Get or create Alpha Vantage client"""
    global client
    if client is None:
        client = AlphaVantageClient()
        await client.__aenter__()
    return client

class FXRequest(BaseModel):
    """FX rate or series request"""
    from_symbol: str
    to_symbol: str
    interval: Optional[str] = "DAILY"  # DAILY, WEEKLY, MONTHLY

class CommodityRequest(BaseModel):
    """Commodity rate or series request"""
    symbol: str
    market: Optional[str] = "USD"
    interval: Optional[str] = "DAILY"  # DAILY, WEEKLY, MONTHLY

@router.post("/fx/rate")
async def get_fx_rate(request: FXRequest, client: AlphaVantageClient = Depends(get_client)) -> Dict:
    """Get current FX rate"""
    try:
        return await client.get_fx_rate(request.from_symbol, request.to_symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fx/series")
async def get_fx_series(request: FXRequest, client: AlphaVantageClient = Depends(get_client)) -> Dict:
    """Get FX time series"""
    try:
        return await client.get_fx_series(
            request.from_symbol,
            request.to_symbol,
            request.interval
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commodities/rate")
async def get_commodity_rate(request: CommodityRequest, client: AlphaVantageClient = Depends(get_client)) -> Dict:
    """Get current commodity rate"""
    try:
        return await client.get_commodity_rate(request.symbol, request.market)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commodities/series")
async def get_commodity_series(request: CommodityRequest, client: AlphaVantageClient = Depends(get_client)) -> Dict:
    """Get commodity time series"""
    try:
        return await client.get_commodity_series(request.symbol, request.interval)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
