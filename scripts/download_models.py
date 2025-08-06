#!/usr/bin/env python3
"""
Script to download and cache ML models during Docker build
This ensures models are available immediately when container starts
"""
import os
import logging
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import nltk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_finbert():
    """Download FinBERT model and tokenizer"""
    model_name = os.environ.get("FINBERT_MODEL", "ProsusAI/finbert")
    cache_dir = os.environ.get("FINBERT_CACHE_DIR", "/app/models/finbert")
    
    logger.info(f"Downloading FinBERT model: {model_name}")
    try:
        # Download tokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir=cache_dir,
            force_download=False
        )
        logger.info("FinBERT tokenizer downloaded successfully")
        
        # Download model
        model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            cache_dir=cache_dir,
            force_download=False
        )
        logger.info("FinBERT model downloaded successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error downloading FinBERT: {e}")
        return False

def download_nltk_data():
    """Download required NLTK data"""
    nltk_data_dir = os.environ.get("NLTK_DATA", "/root/nltk_data")
    
    logger.info("Downloading NLTK data")
    try:
        # Download VADER lexicon
        nltk.download('vader_lexicon', download_dir=nltk_data_dir)
        logger.info("NLTK VADER lexicon downloaded successfully")
        
        # Download punkt tokenizer (if needed for text preprocessing)
        nltk.download('punkt', download_dir=nltk_data_dir)
        logger.info("NLTK punkt tokenizer downloaded successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error downloading NLTK data: {e}")
        return False

def main():
    """Main function to download all required models"""
    logger.info("Starting model download process")
    
    # Download NLTK data
    nltk_success = download_nltk_data()
    
    # Download FinBERT model (optional - can be skipped for faster builds)
    # Uncomment the following lines to download FinBERT during build
    # This will increase build time but reduce first-run startup time
    
    # if os.environ.get("DOWNLOAD_FINBERT_ON_BUILD", "false").lower() == "true":
    #     finbert_success = download_finbert()
    #     if not finbert_success:
    #         logger.warning("FinBERT download failed - will download on first use")
    
    if nltk_success:
        logger.info("Model download process completed successfully")
    else:
        logger.error("Some downloads failed - models will be downloaded on first use")

if __name__ == "__main__":
    main()
