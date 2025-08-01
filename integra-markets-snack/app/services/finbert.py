"""
FinBERT implementation for financial sentiment analysis.
This module provides a financial domain-specific sentiment analyzer using the ProsusAI/finbert model.
"""
import os
import logging
import torch
from typing import Dict, Any, Optional
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinBERTAnalyzer:
    """
    Financial sentiment analyzer using the ProsusAI/finbert model.
    This class handles model loading, caching, and inference for financial text.
    """
    
    _instance = None  # Singleton instance
    
    def __new__(cls):
        """Implement singleton pattern for model reuse"""
        if cls._instance is None:
            cls._instance = super(FinBERTAnalyzer, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the FinBERT model and tokenizer"""
        if self._initialized:
            return
            
        self._initialized = True
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device} for FinBERT")
        
        # Get settings from config
        self.model_name = settings.FINBERT_MODEL
        self.cache_dir = settings.FINBERT_CACHE_DIR
        self.hf_token = settings.HUGGING_FACE_TOKEN
        
        if not self.hf_token:
            logger.warning("No Hugging Face token found in environment. Some models may be rate-limited.")
        
        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Default sentiment labels mapping
        self.labels = ["positive", "negative", "neutral"]
        self.market_labels = ["bullish", "bearish", "neutral"]
        
        # Load model and tokenizer
        try:
            self._load_model_and_tokenizer()
        except Exception as e:
            logger.error(f"Error loading FinBERT model: {str(e)}")
            self.model = None
            self.tokenizer = None
            self._initialized = False
    
    def _load_model_and_tokenizer(self):
        """Load the FinBERT model and tokenizer"""
        try:
            # Load tokenizer with auth token if available
            logger.info(f"Loading FinBERT tokenizer: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name, 
                use_auth_token=self.hf_token,
                cache_dir=self.cache_dir
            )
            
            # Load model with auth token if available and move to device
            logger.info(f"Loading FinBERT model: {self.model_name}")
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                use_auth_token=self.hf_token,
                cache_dir=self.cache_dir
            ).to(self.device)
            
            logger.info("FinBERT model and tokenizer loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze the sentiment of a financial text.
        
        Args:
            text (str): The financial text to analyze
            
        Returns:
            Dict containing sentiment analysis results with confidence scores
        """
        if not self._initialized or self.model is None or self.tokenizer is None:
            logger.error("FinBERT model not properly initialized")
            return {
                "error": "Model not initialized",
                "bullish": 0.33,
                "bearish": 0.33,
                "neutral": 0.34,
                "sentiment": "NEUTRAL",
                "confidence": 0.34
            }
        
        try:
            # Preprocess text (truncate if needed)
            if len(text) > 512 * 4:  # Approximate token limit
                text = text[:2048]  # Truncate very long texts
                logger.warning("Text truncated for FinBERT analysis")
            
            # Tokenize input
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            ).to(self.device)
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # Convert to probabilities
            probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
            
            # Convert to Python floats
            scores = probabilities[0].cpu().numpy().tolist()
            
            # Map to sentiment labels (finbert is [positive, negative, neutral])
            results = {
                "bullish": scores[0],  # positive maps to bullish
                "bearish": scores[1],  # negative maps to bearish
                "neutral": scores[2]   # neutral stays neutral
            }
            
            # Get the most likely sentiment
            max_sentiment = max(results, key=results.get)
            sentiment_map = {
                "bullish": "BULLISH",
                "bearish": "BEARISH",
                "neutral": "NEUTRAL"
            }
            
            # Add the sentiment label and confidence
            results["sentiment"] = sentiment_map[max_sentiment]
            results["confidence"] = results[max_sentiment]
            
            return results
            
        except Exception as e:
            logger.error(f"Error analyzing text with FinBERT: {str(e)}")
            return {
                "error": str(e),
                "bullish": 0.33,
                "bearish": 0.33,
                "neutral": 0.34,
                "sentiment": "NEUTRAL",
                "confidence": 0.34
            }

# Create singleton instance
finbert_analyzer = FinBERTAnalyzer()

def analyze_financial_text(text: str) -> Dict[str, Any]:
    """
    Analyze financial text sentiment using FinBERT.
    
    Args:
        text (str): The financial text to analyze
        
    Returns:
        Dict containing sentiment analysis results
    """
    return finbert_analyzer.analyze(text)