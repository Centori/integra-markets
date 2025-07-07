import os
import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from geopy.geocoders import Nominatim

from app.core.config import settings
from app.models.weather import WeatherData, Location, WeatherImpact
from app.models.commodities import Commodity, CommodityRegion

# Configure logging
logger = logging.getLogger(__name__)

class WeatherService:
    """Service for fetching and analyzing weather data"""
    
    def __init__(self, db: Session):
        self.db = db
        self.openweathermap_api_key = settings.OPENWEATHERMAP_API_KEY
        self.geocoder = Nominatim(user_agent="integra_markets")
        
    async def fetch_openweathermap_data(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch current weather data from OpenWeatherMap API"""
        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.openweathermap_api_key,
            "units": "metric"  # Use metric units
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching OpenWeatherMap data: {str(e)}")
            return {}
    
    async def fetch_weathergov_data(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch weather data from Weather.gov API (US only)"""
        # First, get the forecast grid endpoint
        points_url = f"https://api.weather.gov/points/{lat},{lon}"
        
        try:
            async with httpx.AsyncClient() as client:
                # Get the forecast URL from points endpoint
                points_response = await client.get(
                    points_url, 
                    headers={"User-Agent": "IntegraMVP/1.0"}
                )
                points_response.raise_for_status()
                points_data = points_response.json()
                
                # Get the forecast URL
                forecast_url = points_data["properties"]["forecast"]
                
                # Get the forecast data
                forecast_response = await client.get(
                    forecast_url,
                    headers={"User-Agent": "IntegraMVP/1.0"}
                )
                forecast_response.raise_for_status()
                return forecast_response.json()
        except Exception as e:
            logger.error(f"Error fetching Weather.gov data: {str(e)}")
            return {}
    
    async def get_or_create_location(self, name: str, lat: float, lon: float) -> Location:
        """Get or create a location in the database"""
        location = self.db.query(Location).filter(
            Location.name == name,
            Location.latitude == lat,
            Location.longitude == lon
        ).first()
        
        if not location:
            location = Location(
                name=name,
                latitude=lat,
                longitude=lon
            )
            self.db.add(location)
            self.db.commit()
            self.db.refresh(location)
            
        return location
    
    async def store_weather_data(self, location_id: int, data: Dict[str, Any], source: str) -> WeatherData:
        """Store weather data in the database"""
        # Extract relevant data based on source
        if source == "openweathermap":
            weather_data = WeatherData(
                location_id=location_id,
                timestamp=datetime.utcnow(),
                temperature=data.get("main", {}).get("temp"),
                feels_like=data.get("main", {}).get("feels_like"),
                humidity=data.get("main", {}).get("humidity"),
                pressure=data.get("main", {}).get("pressure"),
                wind_speed=data.get("wind", {}).get("speed"),
                wind_direction=data.get("wind", {}).get("deg"),
                precipitation=data.get("rain", {}).get("1h", 0) if "rain" in data else 0,
                weather_condition=data.get("weather", [{}])[0].get("main", "unknown"),
                weather_description=data.get("weather", [{}])[0].get("description", ""),
                source=source
            )
        elif source == "weather.gov":
            # Extract first period from forecast
            period = data.get("properties", {}).get("periods", [{}])[0]
            weather_data = WeatherData(
                location_id=location_id,
                timestamp=datetime.utcnow(),
                temperature=period.get("temperature"),
                feels_like=None,  # Not provided by Weather.gov
                humidity=None,  # Not directly provided
                pressure=None,  # Not directly provided
                wind_speed=period.get("windSpeed", "0 mph").split()[0],  # Extract numeric value
                wind_direction=period.get("windDirection"),
                precipitation=None,  # Not directly provided
                weather_condition=period.get("shortForecast", "unknown"),
                weather_description=period.get("detailedForecast", ""),
                source=source
            )
        else:
            raise ValueError(f"Unknown weather data source: {source}")
        
        self.db.add(weather_data)
        self.db.commit()
        self.db.refresh(weather_data)
        
        return weather_data
    
    async def analyze_weather_impacts(self, commodity_id: int) -> List[Dict[str, Any]]:
        """Analyze weather impacts on a specific commodity"""
        # Get commodity and its production regions
        commodity = self.db.query(Commodity).filter(Commodity.id == commodity_id).first()
        if not commodity:
            logger.error(f"Commodity with ID {commodity_id} not found")
            return []
        
        regions = self.db.query(CommodityRegion).filter(
            CommodityRegion.commodity_id == commodity_id
        ).all()
        
        impacts = []
        for region in regions:
            # Get location for the region
            location = self.db.query(Location).filter(Location.id == region.location_id).first()
            if not location:
                continue
            
            # Get recent weather data for the location
            recent_weather = self.db.query(WeatherData).filter(
                WeatherData.location_id == location.id,
                WeatherData.timestamp >= datetime.utcnow() - timedelta(days=7)
            ).order_by(WeatherData.timestamp.desc()).first()
            
            if not recent_weather:
                continue
            
            # Analyze impact based on commodity type and weather conditions
            impact_level = self._calculate_impact_level(commodity, recent_weather)
            
            # Store impact analysis
            weather_impact = WeatherImpact(
                weather_data_id=recent_weather.id,
                commodity_id=commodity.id,
                impact_level=impact_level.get("level"),
                impact_description=impact_level.get("description"),
                created_at=datetime.utcnow()
            )
            
            self.db.add(weather_impact)
            self.db.commit()
            
            impacts.append({
                "region": location.name,
                "weather_condition": recent_weather.weather_condition,
                "impact_level": impact_level.get("level"),
                "impact_description": impact_level.get("description")
            })
        
        return impacts
    
    def _calculate_impact_level(self, commodity: Commodity, weather: WeatherData) -> Dict[str, Any]:
        """Calculate weather impact level on a commodity"""
        # Default impact
        impact = {
            "level": "neutral",
            "description": "No significant impact expected"
        }
        
        # Analyze based on commodity type and weather
        if commodity.category == "agriculture":
            # Agricultural commodities are sensitive to temperature and precipitation
            if weather.weather_condition.lower() in ["rain", "thunderstorm"]:
                if weather.precipitation and weather.precipitation > 30:
                    impact = {
                        "level": "negative",
                        "description": f"Heavy rainfall ({weather.precipitation}mm) may damage crops"
                    }
                else:
                    impact = {
                        "level": "positive",
                        "description": "Moderate rainfall beneficial for crop growth"
                    }
            elif weather.weather_condition.lower() in ["clear", "clouds"] and weather.temperature > 30:
                impact = {
                    "level": "negative",
                    "description": f"High temperatures ({weather.temperature}°C) may stress crops"
                }
            elif weather.weather_condition.lower() in ["snow", "freezing"]:
                impact = {
                    "level": "negative",
                    "description": "Freezing conditions may damage crops"
                }
                
        elif commodity.category == "energy":
            # Energy commodities like natural gas are affected by temperature
            if weather.temperature < 5:
                impact = {
                    "level": "positive",
                    "description": f"Cold temperatures ({weather.temperature}°C) increase heating demand"
                }
            elif weather.temperature > 30:
                impact = {
                    "level": "positive",
                    "description": f"High temperatures ({weather.temperature}°C) increase cooling demand"
                }
                
        return impact
    
    async def update_all_commodity_regions(self) -> Dict[str, Any]:
        """Update weather data for all commodity production regions"""
        regions = self.db.query(CommodityRegion).all()
        
        results = {
            "total": len(regions),
            "successful": 0,
            "failed": 0,
            "details": []
        }
        
        for region in regions:
            location = self.db.query(Location).filter(Location.id == region.location_id).first()
            if not location:
                results["failed"] += 1
                results["details"].append({
                    "region_id": region.id,
                    "status": "failed",
                    "reason": "Location not found"
                })
                continue
            
            try:
                # Fetch weather data
                weather_data = await self.fetch_openweathermap_data(location.latitude, location.longitude)
                
                if weather_data:
                    # Store weather data
                    await self.store_weather_data(location.id, weather_data, "openweathermap")
                    
                    results["successful"] += 1
                    results["details"].append({
                        "region_id": region.id,
                        "location": location.name,
                        "status": "success"
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "region_id": region.id,
                        "location": location.name,
                        "status": "failed",
                        "reason": "No weather data returned"
                    })
            except Exception as e:
                logger.error(f"Error updating weather for region {region.id}: {str(e)}")
                results["failed"] += 1
                results["details"].append({
                    "region_id": region.id,
                    "location": location.name if location else "unknown",
                    "status": "failed",
                    "reason": str(e)
                })
        
        return results
