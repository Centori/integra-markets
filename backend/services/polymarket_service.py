"""
Polymarket API Integration Service
Handles commodity and weather prediction markets
"""

import os
import requests
import json
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging

# Configure logging
logger = logging.getLogger(__name__)

class MarketCategory(Enum):
    """Categories for prediction markets"""
    OIL_ENERGY = "Oil & Energy"
    METALS = "Metals"
    AGRICULTURE = "Agriculture"
    WEATHER = "Weather"
    COMMODITIES = "Commodities"
    ECONOMICS = "Economics"
    INTEREST_RATES = "Interest Rates"
    INFLATION = "Inflation"
    CENTRAL_BANKS = "Central Banks"
    FOREX = "Foreign Exchange"
    GEOPOLITICS = "Geopolitics"
    OPEC = "OPEC"

class MarketStatus(Enum):
    """Status of prediction markets"""
    OPEN = "open"
    CLOSED = "closed"
    RESOLVED = "resolved"
    DISPUTED = "disputed"

@dataclass
class PredictionMarket:
    """Data model for prediction markets"""
    id: str
    title: str
    description: str
    category: MarketCategory
    status: MarketStatus
    yes_price: float
    no_price: float
    volume: float
    liquidity: float
    trader_count: int
    created_at: datetime
    resolve_date: datetime
    commodity_ticker: Optional[str] = None
    target_price: Optional[float] = None
    image_url: Optional[str] = None
    tags: List[str] = None

class PolymarketService:
    """
    Service for interacting with Polymarket API
    Focused on commodity and weather prediction markets
    """
    
    def __init__(self):
        # Polymarket API configuration
        self.base_url = os.getenv("POLYMARKET_API_URL", "https://gamma-api.polymarket.com")
        self.api_key = os.getenv("POLYMARKET_API_KEY", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
            "Content-Type": "application/json"
        }
        
        # Commodity-specific configurations
        self.commodity_tickers = {
            "oil": ["WTI", "BRENT", "CL", "BZ", "CRUDE"],
            "metals": ["GOLD", "SILVER", "COPPER", "PLATINUM", "PALLADIUM", "XAU", "XAG", "HG", "ALUMINUM", "NICKEL", "ZINC", "LITHIUM", "COBALT"],
            "agriculture": ["WHEAT", "CORN", "SOYBEANS", "COFFEE", "SUGAR", "COCOA", "COTTON", "RICE", "ZW", "ZC", "ZS", "PALM_OIL"]
        }
        
        # Forex pairs
        self.forex_pairs = [
            "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD",
            "EUR/GBP", "EUR/JPY", "GBP/JPY", "USD/CNY", "USD/CNH", "USD/RUB",
            "USD/BRL", "USD/MXN", "USD/ZAR", "USD/TRY", "DXY"
        ]
        
        # Central banks
        self.central_banks = {
            "fed": {"name": "Federal Reserve", "currency": "USD", "region": "United States"},
            "ecb": {"name": "European Central Bank", "currency": "EUR", "region": "Eurozone"},
            "boe": {"name": "Bank of England", "currency": "GBP", "region": "United Kingdom"},
            "boj": {"name": "Bank of Japan", "currency": "JPY", "region": "Japan"},
            "pboc": {"name": "People's Bank of China", "currency": "CNY", "region": "China"},
            "rba": {"name": "Reserve Bank of Australia", "currency": "AUD", "region": "Australia"},
            "snb": {"name": "Swiss National Bank", "currency": "CHF", "region": "Switzerland"},
            "boc": {"name": "Bank of Canada", "currency": "CAD", "region": "Canada"}
        }
        
        # Geopolitically significant regions for commodities
        self.geopolitical_regions = {
            # Oil & Energy hotspots
            "venezuela": {"commodities": ["oil"], "significance": "OPEC member, heavy crude reserves"},
            "iran": {"commodities": ["oil", "gas"], "significance": "OPEC member, sanctions impact"},
            "iraq": {"commodities": ["oil"], "significance": "OPEC member, major producer"},
            "saudi_arabia": {"commodities": ["oil"], "significance": "OPEC leader, swing producer"},
            "russia": {"commodities": ["oil", "gas", "wheat", "palladium"], "significance": "Major energy exporter, OPEC+"},
            "strait_of_hormuz": {"commodities": ["oil", "lng"], "significance": "Critical chokepoint, 20% global oil"},
            "suez_canal": {"commodities": ["oil", "lng", "containers"], "significance": "Trade route, 12% global trade"},
            "red_sea": {"commodities": ["oil", "containers"], "significance": "Houthi disruptions, shipping routes"},
            "somaliland": {"commodities": ["shipping"], "significance": "Gulf of Aden security"},
            "libya": {"commodities": ["oil"], "significance": "OPEC member, supply disruptions"},
            "nigeria": {"commodities": ["oil", "cocoa"], "significance": "OPEC member, African producer"},
            "angola": {"commodities": ["oil"], "significance": "Former OPEC member, African producer"},
            
            # Metals hotspots
            "congo_drc": {"commodities": ["cobalt", "copper", "coltan"], "significance": "70% global cobalt, EV batteries"},
            "chile": {"commodities": ["copper", "lithium"], "significance": "Largest copper producer"},
            "peru": {"commodities": ["copper", "silver", "zinc"], "significance": "Major copper/silver producer"},
            "south_africa": {"commodities": ["gold", "platinum", "palladium", "chrome"], "significance": "PGM dominant, mining power"},
            "australia": {"commodities": ["iron_ore", "lithium", "coal"], "significance": "Iron ore giant, lithium reserves"},
            "indonesia": {"commodities": ["nickel", "tin", "palm_oil", "coal"], "significance": "Nickel export controls"},
            "china": {"commodities": ["rare_earths", "steel"], "significance": "Rare earth dominance, demand driver"},
            
            # Agriculture hotspots
            "ukraine": {"commodities": ["wheat", "corn", "sunflower_oil"], "significance": "Breadbasket, war impact"},
            "brazil": {"commodities": ["soybeans", "coffee", "sugar", "beef"], "significance": "Agri superpower"},
            "argentina": {"commodities": ["soybeans", "corn", "wheat", "beef"], "significance": "Major grain exporter"},
            "india": {"commodities": ["rice", "wheat", "sugar", "cotton"], "significance": "Export restrictions impact"},
            "thailand": {"commodities": ["rice", "rubber", "sugar"], "significance": "Rice exporter"},
            "vietnam": {"commodities": ["coffee", "rice", "rubber"], "significance": "Robusta coffee leader"},
            "ivory_coast": {"commodities": ["cocoa"], "significance": "40% global cocoa"},
            "ghana": {"commodities": ["cocoa", "gold"], "significance": "Cocoa producer"}
        }
        
        # OPEC+ members
        self.opec_members = [
            "Saudi Arabia", "Iraq", "Iran", "UAE", "Kuwait", "Venezuela",
            "Libya", "Nigeria", "Algeria", "Angola", "Congo", "Equatorial Guinea", "Gabon"
        ]
        self.opec_plus_members = self.opec_members + [
            "Russia", "Kazakhstan", "Azerbaijan", "Bahrain", "Brunei",
            "Malaysia", "Mexico", "Oman", "South Sudan", "Sudan"
        ]
        
        # Market templates for commodity predictions
        self.market_templates = {
            "price_target": "Will {commodity} {action} ${price} by {date}?",
            "price_range": "Will {commodity} trade between ${low} and ${high} on {date}?",
            "weather_impact": "Will {weather_event} impact {commodity} prices by more than {percent}%?",
            "supply_shock": "Will {region} {commodity} supply decrease by more than {percent}% in {timeframe}?",
            "rate_decision": "Will the {central_bank} {action} rates by {basis_points}bps at the {meeting} meeting?",
            "inflation": "Will {region} {inflation_measure} {action} {target}% by {date}?",
            "forex": "Will {pair} {action} {level} by {date}?",
            "geopolitical": "Will {event} in {region} impact {commodity} prices by more than {percent}%?"
        }
    
    def search_commodity_markets(self, 
                                commodity: Optional[str] = None,
                                category: Optional[MarketCategory] = None,
                                status: MarketStatus = MarketStatus.OPEN,
                                limit: int = 50) -> List[PredictionMarket]:
        """
        Search for commodity-related prediction markets
        """
        try:
            # Build search query
            query_params = {
                "active": status == MarketStatus.OPEN,
                "closed": status == MarketStatus.CLOSED,
                "limit": limit,
                "orderBy": "volume",
                "ascending": False
            }
            
            # Add commodity filter if specified
            search_terms = []
            if commodity:
                search_terms.extend(self._get_commodity_search_terms(commodity))
            
            if category:
                search_terms.append(category.value.lower())
            
            # Add common commodity terms
            search_terms.extend(["oil", "gold", "wheat", "commodity", "metals", "agriculture"])
            
            # Search markets
            markets = []
            for term in set(search_terms):
                query_params["query"] = term
                response = requests.get(
                    f"{self.base_url}/markets",
                    params=query_params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    for market_data in data.get("markets", []):
                        market = self._parse_market_data(market_data)
                        if market and self._is_commodity_market(market):
                            markets.append(market)
            
            # Remove duplicates and sort by volume
            unique_markets = {m.id: m for m in markets}.values()
            return sorted(unique_markets, key=lambda x: x.volume, reverse=True)[:limit]
            
        except Exception as e:
            logger.error(f"Error searching commodity markets: {str(e)}")
            return self._get_mock_commodity_markets(limit)
    
    def get_market_details(self, market_id: str) -> Optional[PredictionMarket]:
        """
        Get detailed information about a specific market
        """
        try:
            response = requests.get(
                f"{self.base_url}/markets/{market_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_market_data(data)
            
        except Exception as e:
            logger.error(f"Error fetching market details: {str(e)}")
        
        return None
    
    def create_commodity_market(self, 
                              commodity: str,
                              target_price: float,
                              resolve_date: datetime,
                              market_type: str = "price_target") -> Dict[str, Any]:
        """
        Create a new commodity prediction market
        """
        try:
            # Format market title based on template
            title = self._format_market_title(
                commodity, 
                target_price, 
                resolve_date, 
                market_type
            )
            
            # Build market creation payload
            payload = {
                "question": title,
                "description": f"This market will resolve to YES if {commodity} reaches ${target_price} by {resolve_date.strftime('%B %d, %Y')}",
                "endDate": resolve_date.isoformat(),
                "tags": [commodity.upper(), "COMMODITIES", "PRICE_PREDICTION"],
                "category": MarketCategory.COMMODITIES.value,
                "liquidity": 1000,  # Initial liquidity in USDC
                "initialProbability": 0.5
            }
            
            response = requests.post(
                f"{self.base_url}/markets",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 201:
                return {
                    "status": "success",
                    "market": response.json()
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to create market: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error creating commodity market: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def place_order(self, 
                   market_id: str,
                   side: str,  # "yes" or "no"
                   amount: float,
                   price: Optional[float] = None) -> Dict[str, Any]:
        """
        Place an order on a prediction market
        """
        try:
            payload = {
                "marketId": market_id,
                "side": side.upper(),
                "amount": amount,
                "price": price if price else None,  # Market order if no price
                "orderType": "LIMIT" if price else "MARKET"
            }
            
            response = requests.post(
                f"{self.base_url}/orders",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 201:
                return {
                    "status": "success",
                    "order": response.json()
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to place order: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error placing order: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def get_user_positions(self, user_address: str) -> List[Dict[str, Any]]:
        """
        Get user's positions in prediction markets
        """
        try:
            response = requests.get(
                f"{self.base_url}/users/{user_address}/positions",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json().get("positions", [])
                
        except Exception as e:
            logger.error(f"Error fetching user positions: {str(e)}")
        
        return []
    
    def get_market_orderbook(self, market_id: str) -> Dict[str, Any]:
        """
        Get orderbook for a specific market
        """
        try:
            response = requests.get(
                f"{self.base_url}/markets/{market_id}/orderbook",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
                
        except Exception as e:
            logger.error(f"Error fetching orderbook: {str(e)}")
        
        return {"bids": [], "asks": []}
    
    def _parse_market_data(self, data: Dict) -> Optional[PredictionMarket]:
        """
        Parse raw market data into PredictionMarket object
        """
        try:
            # Extract commodity ticker if present in title
            ticker = self._extract_commodity_ticker(data.get("question", ""))
            
            return PredictionMarket(
                id=data.get("id", ""),
                title=data.get("question", ""),
                description=data.get("description", ""),
                category=self._determine_category(data.get("question", ""), data.get("tags", [])),
                status=MarketStatus(data.get("status", "open").lower()),
                yes_price=data.get("lastTradePrice", 0.5) * 100,
                no_price=(1 - data.get("lastTradePrice", 0.5)) * 100,
                volume=data.get("volume", 0),
                liquidity=data.get("liquidity", 0),
                trader_count=data.get("uniqueTraders", 0),
                created_at=datetime.fromisoformat(data.get("createdAt", datetime.now().isoformat())),
                resolve_date=datetime.fromisoformat(data.get("endDate", (datetime.now() + timedelta(days=30)).isoformat())),
                commodity_ticker=ticker,
                target_price=self._extract_target_price(data.get("question", "")),
                image_url=data.get("imageUrl"),
                tags=data.get("tags", [])
            )
        except Exception as e:
            logger.error(f"Error parsing market data: {str(e)}")
            return None
    
    def _get_commodity_search_terms(self, commodity: str) -> List[str]:
        """
        Get search terms for a specific commodity
        """
        terms = [commodity.lower()]
        
        # Add related tickers
        for category, tickers in self.commodity_tickers.items():
            if commodity.upper() in tickers:
                terms.extend([t.lower() for t in tickers])
                break
        
        # Add common variations
        commodity_map = {
            "oil": ["crude", "petroleum", "wti", "brent"],
            "gold": ["xau", "precious metals", "bullion"],
            "silver": ["xag", "precious metals"],
            "wheat": ["grains", "agriculture", "crops"],
            "corn": ["grains", "maize", "agriculture"],
            "gas": ["natural gas", "lng", "energy"]
        }
        
        terms.extend(commodity_map.get(commodity.lower(), []))
        return terms
    
    def _is_commodity_market(self, market: PredictionMarket) -> bool:
        """
        Check if a market is commodity-related
        """
        commodity_keywords = [
            "oil", "gold", "silver", "wheat", "corn", "copper",
            "gas", "commodity", "metal", "agriculture", "grain",
            "energy", "crude", "brent", "wti", "precious", "bullion"
        ]
        
        title_lower = market.title.lower()
        return any(keyword in title_lower for keyword in commodity_keywords)
    
    def _determine_category(self, title: str, tags: List[str]) -> MarketCategory:
        """
        Determine market category based on title and tags
        """
        text = f"{title} {' '.join(tags)}".lower()
        
        # Central banks and interest rates
        if any(term in text for term in ["fed", "federal reserve", "fomc", "ecb", "boe", "boj", "pboc", "central bank"]):
            return MarketCategory.CENTRAL_BANKS
        elif any(term in text for term in ["interest rate", "rate hike", "rate cut", "basis point", "bps", "fed funds"]):
            return MarketCategory.INTEREST_RATES
        elif any(term in text for term in ["inflation", "cpi", "pce", "core inflation", "deflation", "hyperinflation"]):
            return MarketCategory.INFLATION
        elif any(term in text for term in ["forex", "eur/usd", "gbp/usd", "usd/jpy", "currency", "exchange rate", "dxy", "dollar index"]):
            return MarketCategory.FOREX
        elif any(term in text for term in ["opec", "opec+", "oil cartel", "production cut", "output quota"]):
            return MarketCategory.OPEC
        elif any(term in text for term in ["venezuela", "iran", "iraq", "strait of hormuz", "red sea", "houthi", "sanctions", "congo", "ukraine", "russia", "geopolitical"]):
            return MarketCategory.GEOPOLITICS
        elif any(term in text for term in ["oil", "gas", "energy", "petroleum", "crude", "brent", "wti"]):
            return MarketCategory.OIL_ENERGY
        elif any(term in text for term in ["gold", "silver", "copper", "metal", "platinum", "palladium", "cobalt", "lithium", "nickel"]):
            return MarketCategory.METALS
        elif any(term in text for term in ["wheat", "corn", "soy", "agriculture", "grain", "crop", "coffee", "cocoa", "sugar"]):
            return MarketCategory.AGRICULTURE
        elif any(term in text for term in ["weather", "temperature", "rainfall", "hurricane", "drought", "flood", "el nino", "la nina"]):
            return MarketCategory.WEATHER
        elif any(term in text for term in ["economic", "gdp", "unemployment", "jobs", "recession"]):
            return MarketCategory.ECONOMICS
        else:
            return MarketCategory.COMMODITIES
    
    def _extract_commodity_ticker(self, title: str) -> Optional[str]:
        """
        Extract commodity ticker from market title
        """
        all_tickers = []
        for tickers in self.commodity_tickers.values():
            all_tickers.extend(tickers)
        
        for ticker in all_tickers:
            if ticker in title.upper():
                return ticker
        
        return None
    
    def _extract_target_price(self, title: str) -> Optional[float]:
        """
        Extract target price from market title
        """
        import re
        price_pattern = r'\$(\d+(?:\.\d+)?)'
        match = re.search(price_pattern, title)
        
        if match:
            return float(match.group(1))
        
        return None
    
    def _format_market_title(self, 
                           commodity: str,
                           target_price: float,
                           resolve_date: datetime,
                           market_type: str) -> str:
        """
        Format market title based on template
        """
        if market_type == "price_target":
            action = "close above" if target_price > 0 else "close below"
            return f"Will {commodity.upper()} {action} ${target_price} by {resolve_date.strftime('%B %d, %Y')}?"
        
        return f"Will {commodity.upper()} reach ${target_price} by {resolve_date.strftime('%B %d, %Y')}?"
    
    def _get_mock_commodity_markets(self, limit: int) -> List[PredictionMarket]:
        """
        Return mock commodity markets for development/testing
        Includes commodities, macroeconomics, central banks, FX, and geopolitics
        """
        now = datetime.now()
        
        mock_markets = [
            # Oil & Energy
            PredictionMarket(
                id="mock_brent_80",
                title="Will Brent Crude hit $80 by January 31, 2026?",
                description="This market resolves to YES if Brent Crude oil futures close at or above $80 on January 31, 2026",
                category=MarketCategory.OIL_ENERGY,
                status=MarketStatus.OPEN,
                yes_price=72,
                no_price=28,
                volume=534300,
                liquidity=100000,
                trader_count=5343,
                created_at=now - timedelta(days=10),
                resolve_date=now + timedelta(days=24),
                commodity_ticker="BRENT",
                target_price=80.0,
                tags=["OIL", "ENERGY", "BRENT", "COMMODITIES"]
            ),
            PredictionMarket(
                id="mock_natgas_winter",
                title="Will Natural Gas exceed $4/MMBtu this winter?",
                description="Resolves YES if Henry Hub Natural Gas spot price exceeds $4/MMBtu before March 1, 2026",
                category=MarketCategory.OIL_ENERGY,
                status=MarketStatus.OPEN,
                yes_price=55,
                no_price=45,
                volume=612500,
                liquidity=120000,
                trader_count=6125,
                created_at=now - timedelta(days=20),
                resolve_date=now + timedelta(days=53),
                commodity_ticker="NATGAS",
                target_price=4.0,
                tags=["NATURAL GAS", "ENERGY", "WINTER", "HEATING"]
            ),
            
            # Metals
            PredictionMarket(
                id="mock_gold_2100",
                title="Will Gold exceed $2100/oz by February 15, 2026?",
                description="This market resolves to YES if spot Gold price exceeds $2100 per ounce on February 15, 2026",
                category=MarketCategory.METALS,
                status=MarketStatus.OPEN,
                yes_price=45,
                no_price=55,
                volume=287400,
                liquidity=75000,
                trader_count=2874,
                created_at=now - timedelta(days=5),
                resolve_date=now + timedelta(days=39),
                commodity_ticker="GOLD",
                target_price=2100.0,
                tags=["GOLD", "METALS", "PRECIOUS", "SAFE HAVEN"]
            ),
            PredictionMarket(
                id="mock_copper_china",
                title="Will Copper prices rise >15% on China demand by March 2026?",
                description="Market resolves YES if LME Copper futures rise more than 15% by March 31, 2026",
                category=MarketCategory.METALS,
                status=MarketStatus.OPEN,
                yes_price=60,
                no_price=40,
                volume=423100,
                liquidity=80000,
                trader_count=4231,
                created_at=now - timedelta(days=7),
                resolve_date=now + timedelta(days=83),
                commodity_ticker="COPPER",
                target_price=15.0,
                tags=["COPPER", "METALS", "CHINA", "INDUSTRIAL"]
            ),
            PredictionMarket(
                id="mock_cobalt_congo",
                title="Will DRC cobalt exports face >20% disruption in Q1 2026?",
                description="Resolves YES if Congo DRC cobalt exports decrease by more than 20% in Q1 2026 due to political or logistical issues",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=35,
                no_price=65,
                volume=189000,
                liquidity=45000,
                trader_count=1890,
                created_at=now - timedelta(days=12),
                resolve_date=now + timedelta(days=90),
                commodity_ticker="COBALT",
                tags=["COBALT", "CONGO", "DRC", "EV", "BATTERIES", "GEOPOLITICS"]
            ),
            
            # Agriculture
            PredictionMarket(
                id="mock_wheat_weather",
                title="Will US wheat production decrease >10% due to winter weather?",
                description="Resolves YES if USDA reports >10% decrease in winter wheat production due to weather conditions",
                category=MarketCategory.AGRICULTURE,
                status=MarketStatus.OPEN,
                yes_price=38,
                no_price=62,
                volume=156200,
                liquidity=50000,
                trader_count=1562,
                created_at=now - timedelta(days=15),
                resolve_date=now + timedelta(days=60),
                commodity_ticker="WHEAT",
                tags=["WHEAT", "AGRICULTURE", "WEATHER", "GRAINS"]
            ),
            PredictionMarket(
                id="mock_coffee_brazil",
                title="Will Arabica coffee exceed $3/lb on Brazil drought by Q2 2026?",
                description="Resolves YES if ICE Arabica coffee futures exceed $3.00 per pound due to Brazilian drought conditions",
                category=MarketCategory.AGRICULTURE,
                status=MarketStatus.OPEN,
                yes_price=42,
                no_price=58,
                volume=234500,
                liquidity=55000,
                trader_count=2345,
                created_at=now - timedelta(days=8),
                resolve_date=now + timedelta(days=120),
                commodity_ticker="COFFEE",
                target_price=3.0,
                tags=["COFFEE", "BRAZIL", "DROUGHT", "AGRICULTURE"]
            ),
            
            # Interest Rates & Central Banks
            PredictionMarket(
                id="mock_fed_rate_jan",
                title="Will the Fed cut rates by 25bps at the January 2026 FOMC meeting?",
                description="Resolves YES if the Federal Reserve announces a 25 basis point rate cut at the January 2026 FOMC meeting",
                category=MarketCategory.CENTRAL_BANKS,
                status=MarketStatus.OPEN,
                yes_price=68,
                no_price=32,
                volume=1245000,
                liquidity=250000,
                trader_count=12450,
                created_at=now - timedelta(days=14),
                resolve_date=now + timedelta(days=21),
                tags=["FED", "FOMC", "INTEREST RATES", "MONETARY POLICY"]
            ),
            PredictionMarket(
                id="mock_ecb_rate_q1",
                title="Will the ECB cut rates below 3% by end of Q1 2026?",
                description="Resolves YES if the European Central Bank's main refinancing rate falls below 3.00% by March 31, 2026",
                category=MarketCategory.CENTRAL_BANKS,
                status=MarketStatus.OPEN,
                yes_price=55,
                no_price=45,
                volume=876000,
                liquidity=180000,
                trader_count=8760,
                created_at=now - timedelta(days=10),
                resolve_date=now + timedelta(days=83),
                tags=["ECB", "EUROZONE", "INTEREST RATES", "MONETARY POLICY"]
            ),
            PredictionMarket(
                id="mock_boj_negative",
                title="Will the Bank of Japan end negative rates by mid-2026?",
                description="Resolves YES if BOJ raises rates above 0% before July 1, 2026",
                category=MarketCategory.CENTRAL_BANKS,
                status=MarketStatus.OPEN,
                yes_price=72,
                no_price=28,
                volume=654000,
                liquidity=140000,
                trader_count=6540,
                created_at=now - timedelta(days=20),
                resolve_date=now + timedelta(days=175),
                tags=["BOJ", "JAPAN", "INTEREST RATES", "YEN"]
            ),
            
            # Inflation
            PredictionMarket(
                id="mock_us_cpi_3",
                title="Will US Core CPI fall below 3% by March 2026?",
                description="Resolves YES if US Core CPI year-over-year reading falls below 3.0% in the March 2026 release",
                category=MarketCategory.INFLATION,
                status=MarketStatus.OPEN,
                yes_price=62,
                no_price=38,
                volume=945000,
                liquidity=200000,
                trader_count=9450,
                created_at=now - timedelta(days=18),
                resolve_date=now + timedelta(days=75),
                tags=["INFLATION", "CPI", "US", "FEDERAL RESERVE"]
            ),
            PredictionMarket(
                id="mock_eu_inflation",
                title="Will Eurozone inflation return to 2% target by Q2 2026?",
                description="Resolves YES if Eurozone HICP falls to or below 2.0% year-over-year by June 2026",
                category=MarketCategory.INFLATION,
                status=MarketStatus.OPEN,
                yes_price=48,
                no_price=52,
                volume=567000,
                liquidity=120000,
                trader_count=5670,
                created_at=now - timedelta(days=12),
                resolve_date=now + timedelta(days=150),
                tags=["INFLATION", "EUROZONE", "ECB", "HICP"]
            ),
            
            # Foreign Exchange
            PredictionMarket(
                id="mock_eurusd_parity",
                title="Will EUR/USD reach parity (1.00) by mid-2026?",
                description="Resolves YES if EUR/USD spot rate touches 1.0000 or below before July 1, 2026",
                category=MarketCategory.FOREX,
                status=MarketStatus.OPEN,
                yes_price=25,
                no_price=75,
                volume=789000,
                liquidity=165000,
                trader_count=7890,
                created_at=now - timedelta(days=25),
                resolve_date=now + timedelta(days=175),
                target_price=1.0,
                tags=["FOREX", "EUR/USD", "EURO", "DOLLAR"]
            ),
            PredictionMarket(
                id="mock_usdjpy_160",
                title="Will USD/JPY break above 160 in Q1 2026?",
                description="Resolves YES if USD/JPY spot rate exceeds 160.00 before April 1, 2026",
                category=MarketCategory.FOREX,
                status=MarketStatus.OPEN,
                yes_price=40,
                no_price=60,
                volume=543000,
                liquidity=115000,
                trader_count=5430,
                created_at=now - timedelta(days=8),
                resolve_date=now + timedelta(days=83),
                target_price=160.0,
                tags=["FOREX", "USD/JPY", "YEN", "BOJ INTERVENTION"]
            ),
            PredictionMarket(
                id="mock_dxy_110",
                title="Will the Dollar Index (DXY) exceed 110 by February 2026?",
                description="Resolves YES if the US Dollar Index closes above 110.00 before March 1, 2026",
                category=MarketCategory.FOREX,
                status=MarketStatus.OPEN,
                yes_price=35,
                no_price=65,
                volume=432000,
                liquidity=95000,
                trader_count=4320,
                created_at=now - timedelta(days=15),
                resolve_date=now + timedelta(days=53),
                target_price=110.0,
                tags=["FOREX", "DXY", "DOLLAR INDEX", "USD"]
            ),
            
            # OPEC
            PredictionMarket(
                id="mock_opec_cut",
                title="Will OPEC+ announce additional production cuts in Q1 2026?",
                description="Resolves YES if OPEC+ announces new production cuts of >500k bpd at any Q1 2026 meeting",
                category=MarketCategory.OPEC,
                status=MarketStatus.OPEN,
                yes_price=58,
                no_price=42,
                volume=678000,
                liquidity=145000,
                trader_count=6780,
                created_at=now - timedelta(days=6),
                resolve_date=now + timedelta(days=83),
                tags=["OPEC", "OPEC+", "OIL", "PRODUCTION CUTS", "SAUDI"]
            ),
            PredictionMarket(
                id="mock_saudi_price_war",
                title="Will Saudi Arabia initiate oil price war in 2026?",
                description="Resolves YES if Saudi Arabia increases production unilaterally by >1M bpd in 2026",
                category=MarketCategory.OPEC,
                status=MarketStatus.OPEN,
                yes_price=15,
                no_price=85,
                volume=345000,
                liquidity=75000,
                trader_count=3450,
                created_at=now - timedelta(days=30),
                resolve_date=now + timedelta(days=358),
                tags=["OPEC", "SAUDI ARABIA", "OIL", "PRICE WAR"]
            ),
            
            # Geopolitics
            PredictionMarket(
                id="mock_hormuz_disruption",
                title="Will Strait of Hormuz face major shipping disruption in Q1 2026?",
                description="Resolves YES if >10% reduction in tanker traffic through Strait of Hormuz for >7 consecutive days in Q1 2026",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=22,
                no_price=78,
                volume=456000,
                liquidity=100000,
                trader_count=4560,
                created_at=now - timedelta(days=14),
                resolve_date=now + timedelta(days=83),
                tags=["STRAIT OF HORMUZ", "IRAN", "OIL", "SHIPPING", "GEOPOLITICS"]
            ),
            PredictionMarket(
                id="mock_venezuela_sanctions",
                title="Will US ease Venezuela oil sanctions further in 2026?",
                description="Resolves YES if US Treasury issues new licenses expanding Venezuela oil exports in 2026",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=45,
                no_price=55,
                volume=234000,
                liquidity=50000,
                trader_count=2340,
                created_at=now - timedelta(days=20),
                resolve_date=now + timedelta(days=358),
                tags=["VENEZUELA", "SANCTIONS", "OIL", "US POLICY"]
            ),
            PredictionMarket(
                id="mock_red_sea_shipping",
                title="Will Red Sea shipping disruptions continue through Q2 2026?",
                description="Resolves YES if major shipping lines maintain Red Sea route diversions through June 30, 2026",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=68,
                no_price=32,
                volume=567000,
                liquidity=125000,
                trader_count=5670,
                created_at=now - timedelta(days=10),
                resolve_date=now + timedelta(days=175),
                tags=["RED SEA", "HOUTHI", "SHIPPING", "SUEZ", "GEOPOLITICS"]
            ),
            PredictionMarket(
                id="mock_iran_nuclear",
                title="Will Iran nuclear deal negotiations resume in 2026?",
                description="Resolves YES if formal JCPOA negotiations resume between Iran and P5+1 in 2026",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=30,
                no_price=70,
                volume=189000,
                liquidity=40000,
                trader_count=1890,
                created_at=now - timedelta(days=25),
                resolve_date=now + timedelta(days=358),
                tags=["IRAN", "NUCLEAR", "SANCTIONS", "OIL", "GEOPOLITICS"]
            ),
            PredictionMarket(
                id="mock_ukraine_grain",
                title="Will Black Sea grain corridor be fully restored by mid-2026?",
                description="Resolves YES if Ukraine grain exports via Black Sea return to pre-war levels by July 1, 2026",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=28,
                no_price=72,
                volume=345000,
                liquidity=75000,
                trader_count=3450,
                created_at=now - timedelta(days=18),
                resolve_date=now + timedelta(days=175),
                tags=["UKRAINE", "GRAIN", "BLACK SEA", "WHEAT", "GEOPOLITICS"]
            ),
            PredictionMarket(
                id="mock_nigeria_oil",
                title="Will Nigeria oil production exceed 2M bpd in 2026?",
                description="Resolves YES if Nigeria's oil production exceeds 2 million barrels per day for any month in 2026",
                category=MarketCategory.GEOPOLITICS,
                status=MarketStatus.OPEN,
                yes_price=42,
                no_price=58,
                volume=178000,
                liquidity=38000,
                trader_count=1780,
                created_at=now - timedelta(days=22),
                resolve_date=now + timedelta(days=358),
                tags=["NIGERIA", "OIL", "AFRICA", "OPEC"]
            ),
            
            # Economics
            PredictionMarket(
                id="mock_us_recession",
                title="Will the US enter recession in 2026?",
                description="Resolves YES if NBER declares a US recession beginning in 2026",
                category=MarketCategory.ECONOMICS,
                status=MarketStatus.OPEN,
                yes_price=25,
                no_price=75,
                volume=1567000,
                liquidity=350000,
                trader_count=15670,
                created_at=now - timedelta(days=30),
                resolve_date=now + timedelta(days=358),
                tags=["RECESSION", "US", "GDP", "ECONOMY"]
            ),
            PredictionMarket(
                id="mock_china_gdp",
                title="Will China GDP growth exceed 5% in 2026?",
                description="Resolves YES if China's official GDP growth rate for 2026 exceeds 5.0%",
                category=MarketCategory.ECONOMICS,
                status=MarketStatus.OPEN,
                yes_price=48,
                no_price=52,
                volume=876000,
                liquidity=190000,
                trader_count=8760,
                created_at=now - timedelta(days=15),
                resolve_date=now + timedelta(days=380),
                tags=["CHINA", "GDP", "ECONOMY", "GROWTH"]
            )
        ]
        
        return mock_markets[:limit]

# Initialize service singleton
polymarket_service = PolymarketService()