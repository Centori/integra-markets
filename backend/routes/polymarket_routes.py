"""
FastAPI routes for Polymarket prediction markets
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.polymarket_service import polymarket_service, MarketCategory, MarketStatus
from services.polymarket_fee_service import fee_service, UserTier
from decimal import Decimal

router = APIRouter(prefix="/api/polymarket", tags=["polymarket"])

# Request/Response Models
class MarketSearchRequest(BaseModel):
    commodity: Optional[str] = None
    category: Optional[str] = None
    status: str = "open"
    limit: int = 50

class CreateMarketRequest(BaseModel):
    commodity: str
    target_price: float
    resolve_date: str
    market_type: str = "price_target"

class PlaceOrderRequest(BaseModel):
    market_id: str
    side: str  # "yes" or "no"
    amount: float
    price: Optional[float] = None

class MarketStatsResponse(BaseModel):
    monthly_volume: float
    active_markets: int
    resolving_soon: int
    total_traders: int
    categories: Dict[str, int]

@router.get("/markets")
async def get_commodity_markets(
    commodity: Optional[str] = Query(None, description="Filter by commodity (e.g., 'oil', 'gold', 'wheat')"),
    category: Optional[str] = Query(None, description="Filter by category (e.g., 'Oil & Energy', 'Metals')"),
    status: str = Query("open", description="Market status filter"),
    limit: int = Query(50, description="Maximum number of markets to return")
):
    """
    Get prediction markets for commodities and weather
    """
    try:
        # Convert category string to enum if provided
        market_category = None
        if category:
            category_map = {
                "Oil & Energy": MarketCategory.OIL_ENERGY,
                "Metals": MarketCategory.METALS,
                "Agriculture": MarketCategory.AGRICULTURE,
                "Weather": MarketCategory.WEATHER,
                "Commodities": MarketCategory.COMMODITIES,
                "Economics": MarketCategory.ECONOMICS
            }
            market_category = category_map.get(category)
        
        # Convert status string to enum
        market_status = MarketStatus.OPEN
        if status.lower() == "closed":
            market_status = MarketStatus.CLOSED
        elif status.lower() == "resolved":
            market_status = MarketStatus.RESOLVED
        
        # Search for markets
        markets = polymarket_service.search_commodity_markets(
            commodity=commodity,
            category=market_category,
            status=market_status,
            limit=limit
        )
        
        # Convert to dict format for API response
        markets_data = []
        for market in markets:
            markets_data.append({
                "id": market.id,
                "title": market.title,
                "description": market.description,
                "category": market.category.value,
                "status": market.status.value,
                "yesPrice": market.yes_price,
                "noPrice": market.no_price,
                "volume": market.volume,
                "liquidity": market.liquidity,
                "traderCount": market.trader_count,
                "createdAt": market.created_at.isoformat(),
                "resolveDate": market.resolve_date.isoformat(),
                "commodityTicker": market.commodity_ticker,
                "targetPrice": market.target_price,
                "imageUrl": market.image_url,
                "tags": market.tags or [],
                "yesLowPrice": 100,  # Mock data for price ranges
                "yesHighPrice": int(market.yes_price * 1.5),
                "noLowPrice": 100,
                "noHighPrice": int(market.no_price * 3.5)
            })
        
        return {
            "status": "success",
            "markets": markets_data,
            "total": len(markets_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/markets/{market_id}")
async def get_market_details(market_id: str):
    """
    Get detailed information about a specific market
    """
    try:
        market = polymarket_service.get_market_details(market_id)
        
        if not market:
            # Return mock data for mock markets
            if market_id.startswith("mock_"):
                markets = polymarket_service._get_mock_commodity_markets(10)
                for m in markets:
                    if m.id == market_id:
                        market = m
                        break
        
        if not market:
            raise HTTPException(status_code=404, detail="Market not found")
        
        return {
            "status": "success",
            "market": {
                "id": market.id,
                "title": market.title,
                "description": market.description,
                "category": market.category.value,
                "status": market.status.value,
                "yesPrice": market.yes_price,
                "noPrice": market.no_price,
                "volume": market.volume,
                "liquidity": market.liquidity,
                "traderCount": market.trader_count,
                "createdAt": market.created_at.isoformat(),
                "resolveDate": market.resolve_date.isoformat(),
                "commodityTicker": market.commodity_ticker,
                "targetPrice": market.target_price,
                "imageUrl": market.image_url,
                "tags": market.tags or []
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_market_stats():
    """
    Get overall statistics for commodity prediction markets
    """
    try:
        # Get all open markets
        markets = polymarket_service.search_commodity_markets(
            status=MarketStatus.OPEN,
            limit=100
        )
        
        # Calculate statistics
        monthly_volume = sum(m.volume for m in markets)
        active_markets = len([m for m in markets if m.status == MarketStatus.OPEN])
        
        # Count markets resolving within 7 days
        from datetime import timedelta
        now = datetime.now()
        resolving_soon = len([
            m for m in markets 
            if (m.resolve_date - now).days <= 7 and m.status == MarketStatus.OPEN
        ])
        
        # Count total unique traders
        total_traders = sum(m.trader_count for m in markets)
        
        # Count by category
        categories = {}
        for market in markets:
            cat = market.category.value
            categories[cat] = categories.get(cat, 0) + 1
        
        return MarketStatsResponse(
            monthly_volume=monthly_volume,
            active_markets=active_markets,
            resolving_soon=resolving_soon,
            total_traders=total_traders,
            categories=categories
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/markets/create")
async def create_market(request: CreateMarketRequest):
    """
    Create a new commodity prediction market
    """
    try:
        # Parse resolve date
        resolve_date = datetime.fromisoformat(request.resolve_date)
        
        # Create market
        result = polymarket_service.create_commodity_market(
            commodity=request.commodity,
            target_price=request.target_price,
            resolve_date=resolve_date,
            market_type=request.market_type
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders")
async def place_order(request: PlaceOrderRequest):
    """
    Place an order on a prediction market
    """
    try:
        # Validate side
        if request.side.lower() not in ["yes", "no"]:
            raise HTTPException(status_code=400, detail="Side must be 'yes' or 'no'")
        
        # Place order
        result = polymarket_service.place_order(
            market_id=request.market_id,
            side=request.side,
            amount=request.amount,
            price=request.price
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_address}/positions")
async def get_user_positions(user_address: str):
    """
    Get user's positions in prediction markets
    """
    try:
        positions = polymarket_service.get_user_positions(user_address)
        
        return {
            "status": "success",
            "positions": positions,
            "total": len(positions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/markets/{market_id}/orderbook")
async def get_market_orderbook(market_id: str):
    """
    Get orderbook for a specific market
    """
    try:
        orderbook = polymarket_service.get_market_orderbook(market_id)
        
        return {
            "status": "success",
            "orderbook": orderbook
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/markets/trending")
async def get_trending_markets(limit: int = Query(10, description="Number of markets to return")):
    """
    Get trending commodity prediction markets based on volume and activity
    """
    try:
        # Get all markets and sort by volume
        markets = polymarket_service.search_commodity_markets(
            status=MarketStatus.OPEN,
            limit=limit * 2  # Get more to filter
        )
        
        # Sort by volume and trader count
        trending = sorted(
            markets, 
            key=lambda m: (m.volume * 0.7 + m.trader_count * 100 * 0.3), 
            reverse=True
        )[:limit]
        
        # Convert to response format
        trending_data = []
        for market in trending:
            trending_data.append({
                "id": market.id,
                "title": market.title,
                "category": market.category.value,
                "volume": market.volume,
                "traderCount": market.trader_count,
                "yesPrice": market.yes_price,
                "noPrice": market.no_price,
                "resolveDate": market.resolve_date.isoformat(),
                "trend": "up" if market.yes_price > 50 else "down",
                "volumeChange24h": 12.5  # Mock data
            })
        
        return {
            "status": "success",
            "markets": trending_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== FEE MANAGEMENT ENDPOINTS ==============

class CalculateFeesRequest(BaseModel):
    trade_amount: float
    user_tier: str = "basic"
    is_maker: bool = False
    affiliate_code: Optional[str] = None
    monthly_volume: float = 0

@router.post("/fees/calculate")
async def calculate_trade_fees(request: CalculateFeesRequest):
    """
    Calculate fees for a trade
    """
    try:
        # Convert tier string to enum
        tier_map = {
            "basic": UserTier.BASIC,
            "silver": UserTier.SILVER,
            "gold": UserTier.GOLD,
            "platinum": UserTier.PLATINUM,
            "vip": UserTier.VIP
        }
        user_tier = tier_map.get(request.user_tier.lower(), UserTier.BASIC)
        
        # Calculate fees
        fee_summary = fee_service.calculate_trade_fees(
            trade_amount=Decimal(str(request.trade_amount)),
            user_tier=user_tier,
            is_maker=request.is_maker,
            affiliate_code=request.affiliate_code,
            monthly_volume=Decimal(str(request.monthly_volume))
        )
        
        return {
            "status": "success",
            "fees": {
                "grossAmount": float(fee_summary.gross_amount),
                "tradingFee": float(fee_summary.trading_fee),
                "makerRebate": float(fee_summary.maker_rebate),
                "takerFee": float(fee_summary.taker_fee),
                "platformFee": float(fee_summary.platform_fee),
                "affiliateFee": float(fee_summary.affiliate_fee),
                "netAmount": float(fee_summary.net_amount),
                "totalFees": float(fee_summary.total_fees),
                "breakdown": {k: float(v) for k, v in fee_summary.fee_breakdown.items()}
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fees/tiers")
async def get_fee_tiers():
    """
    Get all fee tiers and their requirements
    """
    try:
        tiers = fee_service.get_tier_requirements()
        return {
            "status": "success",
            "tiers": tiers,
            "description": {
                "basic": "Default tier for all users",
                "silver": "Unlocked at $10K monthly volume",
                "gold": "Unlocked at $50K monthly volume",
                "platinum": "Unlocked at $100K monthly volume",
                "vip": "Unlocked at $500K monthly volume or by invitation"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fees/market-making")
async def get_market_making_spread(
    base_price: float = Query(50.0, description="Market mid-price (0-100)"),
    volatility: float = Query(1.0, description="Volatility multiplier"),
    inventory_ratio: float = Query(0.5, description="Inventory balance (0-1)")
):
    """
    Calculate market making spread for a given price
    """
    try:
        spread = fee_service.calculate_market_making_spread(
            base_price=Decimal(str(base_price)),
            volatility=Decimal(str(volatility)),
            inventory_ratio=Decimal(str(inventory_ratio))
        )
        
        return {
            "status": "success",
            "spread": {k: float(v) for k, v in spread.items()}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AffiliateEarningsRequest(BaseModel):
    referred_volume: float
    affiliate_tier: str = "bronze"

@router.post("/fees/affiliate/earnings")
async def calculate_affiliate_earnings(request: AffiliateEarningsRequest):
    """
    Calculate affiliate earnings based on referred volume
    """
    try:
        earnings = fee_service.calculate_affiliate_earnings(
            referred_volume=Decimal(str(request.referred_volume)),
            affiliate_tier=request.affiliate_tier
        )
        
        return {
            "status": "success",
            "earnings": {k: float(v) if isinstance(v, Decimal) else v for k, v in earnings.items()}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
