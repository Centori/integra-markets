"""
News API routes
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from ..news_aggregator.news_fetcher import NewsItem, get_news_fetcher, NewsFetcher
from pydantic import BaseModel
from datetime import datetime
from ..services.enhanced_sentiment import enhanced_analyzer
from ..app.services.keyword_ml_processor import train_on_market_outcome

class TrainingRequest(BaseModel):
    news_id: str
    actual_outcome: Dict[str, Any]
    user_feedback: Dict[str, Any] = None

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/latest", response_model=List[NewsItem])
async def get_latest_news(
    news_fetcher: NewsFetcher = Depends(get_news_fetcher)
) -> List[NewsItem]:
    """Get latest financial news"""
    return news_fetcher.get_latest_news()

@router.post("/refresh")
async def refresh_news(
    news_fetcher: NewsFetcher = Depends(get_news_fetcher)
) -> List[NewsItem]:
    """Force refresh of news data"""
    return await news_fetcher.fetch_all_news()

@router.post("/train")
async def train_model(
    request: TrainingRequest,
    news_fetcher: NewsFetcher = Depends(get_news_fetcher)
) -> Dict[str, Any]:
    """Train the model based on actual market outcomes
    
    Args:
        request.news_id: ID of the news item
        request.actual_outcome: Actual market outcome data
        request.user_feedback: Optional user feedback about the alert/analysis
    
    Returns:
        Dict containing training results and updated analysis
    """
    try:
        # Get the original news item
        news_items = news_fetcher.get_latest_news()
        news_item = None
        
        # Find the news item by ID or timestamp if ID not found
        for item in news_items:
            if str(getattr(item, 'id', '')) == request.news_id or \
               str(getattr(item, 'published', '')) == request.news_id:
                news_item = item
                break
        
        if not news_item:
            raise HTTPException(
                status_code=404,
                detail=f"News item with ID {request.news_id} not found"
            )
        
        # Get the original analysis if it exists
        original_analysis = await enhanced_analyzer.analyze_news(news_item)
        
        # Train the DQN models
        await enhanced_analyzer.train_on_outcome(
            original_analysis,
            request.actual_outcome,
            request.user_feedback
        )
        
        # Train the keyword processor
        if original_analysis.get('keywords'):
            train_on_market_outcome(
                [k['word'] for k in original_analysis['keywords']],
                original_analysis.get('sentiment', 'neutral'),
                request.actual_outcome
            )
        
        # Reanalyze the news item with updated models
        updated_analysis = await enhanced_analyzer.analyze_news(news_item)
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "news_id": request.news_id,
            "original_analysis": original_analysis,
            "updated_analysis": updated_analysis,
            "training_metadata": {
                "actual_outcome": request.actual_outcome,
                "feedback_processed": bool(request.user_feedback),
                "models_updated": [
                    "enhanced_sentiment",
                    "keyword_processing"
                ]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Training error: {str(e)}"
        )
