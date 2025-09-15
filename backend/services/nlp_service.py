import os
import torch
import logging
import datetime
import numpy as np
from typing import List, Dict, Any, Union
from transformers import BertTokenizer, BertForSequenceClassification
from nltk.tokenize import sent_tokenize
import nltk
from collections import Counter

logger = logging.getLogger(__name__)

class NLPService:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Initialize NLTK
        nltk.download('punkt')
        
        # Initialize FinBERT
        finbert_model = '/app/models/finbert/finbert-tone'
        base_model = 'bert-base-uncased'
        
        try:
            self.tokenizer = BertTokenizer.from_pretrained(finbert_model)
            self.model = BertForSequenceClassification.from_pretrained(finbert_model)
            logger.info("Loaded FinBERT model successfully")
        except Exception as e:
            logger.warning(f"Failed to load FinBERT model, falling back to base BERT: {e}")
            self.tokenizer = BertTokenizer.from_pretrained(base_model)
            self.model = BertForSequenceClassification.from_pretrained(base_model)
        
        self.model.to(self.device)
        self.model.eval()

    def get_sentiment(self, text: str) -> tuple[str, float]:
        """Analyze sentiment of text using FinBERT."""
        try:
            # Encode text and get predictions
            encoded = self.tokenizer(text, return_tensors='pt', max_length=512, truncation=True)
            encoded = {k: v.to(self.device) for k, v in encoded.items()}
            
            with torch.no_grad():
                outputs = self.model(**encoded)
                probabilities = torch.softmax(outputs.logits, dim=1)
                sentiment_score = float(probabilities[0][2] - probabilities[0][0])
                
                # Map to sentiment categories
                if sentiment_score >= 0.2:
                    return "POSITIVE", sentiment_score
                elif sentiment_score <= -0.2:
                    return "NEGATIVE", sentiment_score
                else:
                    return "NEUTRAL", sentiment_score
                
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return "NEUTRAL", 0.0
    
    def extract_key_phrases(self, text: str, num_phrases: int = 5) -> List[str]:
        """Extract key phrases from text using frequency analysis."""
        try:
            # Define stopwords
            stopwords = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
                        'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
                        'that', 'the', 'to', 'was', 'were', 'will', 'with'}
            
            # Extract phrases (bigrams and trigrams)
            words = text.lower().split()
            phrases = []
            
            # Get bigrams
            for i in range(len(words)-1):
                if (words[i] not in stopwords) and (words[i+1] not in stopwords):
                    phrases.append(f"{words[i]} {words[i+1]}")
            
            # Get trigrams
            for i in range(len(words)-2):
                if (words[i] not in stopwords) and (words[i+2] not in stopwords):
                    phrases.append(f"{words[i]} {words[i+1]} {words[i+2]}")
            
            # Count phrase frequencies
            phrase_freq = Counter(phrases)
            
            # Return top phrases
            return [phrase for phrase, _ in phrase_freq.most_common(num_phrases)]
            
        except Exception as e:
            logger.error(f"Error extracting key phrases: {e}")
            return []
    
    def analyze_impact(self, text: str, sentiment: str) -> str:
        """Determine market impact based on text content and sentiment."""
        try:
            # Define impact-related keywords
            high_impact = {
                'surge', 'plunge', 'crash', 'soar', 'crisis',
                'emergency', 'disaster', 'breakthrough', 'ban',
                'sanction', 'war', 'conflict', 'explosion'
            }
            
            medium_impact = {
                'increase', 'decrease', 'rise', 'fall', 'gain',
                'loss', 'change', 'shift', 'move', 'update',
                'agreement', 'deal', 'negotiation'
            }
            
            # Convert text to lowercase for matching
            text_lower = text.lower()
            
            # Check for high impact keywords
            if any(word in text_lower for word in high_impact):
                return "HIGH"
            
            # Consider sentiment for medium impact
            if sentiment in ["POSITIVE", "NEGATIVE"] and \
               any(word in text_lower for word in medium_impact):
                return "MEDIUM"
            
            return "LOW"
            
        except Exception as e:
            logger.error(f"Error analyzing impact: {e}")
            return "LOW"
    
    def analyze_article(self, article: dict) -> dict:
        """Analyze a single article."""
        try:
            # Basic text cleaning
            content = article.get('content', '')
            if not content:
                content = article.get('description', '')
            if not content:
                content = article.get('title', '')
            
            # Get sentiment
            sentiment, score = self.get_sentiment(content)
            
            # Extract key drivers
            key_drivers = self.extract_key_phrases(content)
            
            # Determine market impact
            impact = self.analyze_impact(content, sentiment)
            
            # Clean up the article dict
            clean_article = {
                'title': article.get('title', 'Untitled'),
                'description': article.get('description', ''),
                'content': content,
                'url': article.get('url', ''),
                'published': article.get('published', ''),
                'source': article.get('source', 'Unknown'),
                'sentiment': sentiment,
                'sentiment_score': score,
                'key_drivers': key_drivers,
                'market_impact': impact
            }
            
            return clean_article
        
        except Exception as e:
            logger.error(f"Error analyzing article: {e}")
            return article
    
    def filter_by_time(self, articles: list, hours_back: int) -> list:
        """Filter articles by publication time."""
        try:
            if not hours_back:
                return articles
            
            cutoff = datetime.datetime.now(pytz.UTC) - datetime.timedelta(hours=hours_back)
            filtered = []
            
            for article in articles:
                try:
                    published_str = article.get('published', '')
                    if not published_str:
                        continue
                        
                    if isinstance(published_str, datetime.datetime):
                        published_date = published_str
                    else:
                        # Parse the date string and handle timezone
                        published_date = datetime.datetime.fromisoformat(
                            published_str.replace('Z', '+00:00')
                        )
                    
                    if published_date >= cutoff:
                        filtered.append(article)
                        
                except Exception as e:
                    logger.error(f"Error parsing date for article: {e}")
                    continue
            
            return filtered
            
        except Exception as e:
            logger.error(f"Error filtering by time: {e}")
            return articles
