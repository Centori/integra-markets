"""
Article Summarization Utilities for Integra Markets
Supports URL parsing and text summarization using multiple methods
"""

import logging
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup

# NLTK-based summarization
try:
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.corpus import stopwords
    from nltk.probability import FreqDist
    import heapq
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

# Sumy-based summarization (more advanced)
try:
    from sumy.parsers.html import HtmlParser
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.lsa import LsaSummarizer
    from sumy.summarizers.lex_rank import LexRankSummarizer
    from sumy.summarizers.text_rank import TextRankSummarizer
    from sumy.nlp.stemmers import Stemmer
    from sumy.utils import get_stop_words
    SUMY_AVAILABLE = True
except ImportError:
    SUMY_AVAILABLE = False

# Newspaper3k for article extraction
try:
    from newspaper import Article
    NEWSPAPER_AVAILABLE = True
except ImportError:
    NEWSPAPER_AVAILABLE = False

logger = logging.getLogger(__name__)

class ArticleSummarizer:
    """Multi-method article summarizer for financial news"""
    
    def __init__(self, language='english'):
        self.language = language
        
        # Initialize NLTK resources if available
        if NLTK_AVAILABLE:
            try:
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                nltk.download('punkt')
            try:
                nltk.data.find('corpora/stopwords')
            except LookupError:
                nltk.download('stopwords')
            
            self.stop_words = set(stopwords.words('english'))
        
        logger.info(f"ArticleSummarizer initialized - NLTK: {NLTK_AVAILABLE}, Sumy: {SUMY_AVAILABLE}, Newspaper: {NEWSPAPER_AVAILABLE}")
    
    def summarize_url(self, url: str, sentences: int = 5, method: str = 'auto') -> Dict[str, any]:
        """
        Summarize article from URL using best available method
        
        Args:
            url: Article URL
            sentences: Number of sentences in summary
            method: 'sumy', 'nltk', 'newspaper', or 'auto'
        
        Returns:
            Dict with summary, title, and metadata
        """
        try:
            # Method 1: Try Newspaper3k first (best for articles)
            if NEWSPAPER_AVAILABLE and method in ['newspaper', 'auto']:
                try:
                    return self._summarize_with_newspaper(url, sentences)
                except Exception as e:
                    logger.warning(f"Newspaper3k failed: {e}")
            
            # Method 2: Try Sumy (good for various content)
            if SUMY_AVAILABLE and method in ['sumy', 'auto']:
                try:
                    return self._summarize_with_sumy(url, sentences)
                except Exception as e:
                    logger.warning(f"Sumy failed: {e}")
            
            # Method 3: Fallback to NLTK + BeautifulSoup
            if NLTK_AVAILABLE and method in ['nltk', 'auto']:
                try:
                    return self._summarize_with_nltk(url, sentences)
                except Exception as e:
                    logger.warning(f"NLTK summarization failed: {e}")
            
            # Final fallback: Basic extraction
            return self._basic_extraction(url, sentences)
            
        except Exception as e:
            logger.error(f"Failed to summarize URL {url}: {e}")
            return {
                "error": str(e),
                "url": url,
                "summary": [],
                "title": None
            }
    
    def _summarize_with_newspaper(self, url: str, sentences: int) -> Dict[str, any]:
        """Use Newspaper3k for article extraction and summarization"""
        article = Article(url)
        article.download()
        article.parse()
        article.nlp()  # This performs summarization
        
        # Get summary sentences
        summary_text = article.summary
        summary_sentences = sent_tokenize(summary_text)[:sentences] if NLTK_AVAILABLE else summary_text.split('.')[:sentences]
        
        return {
            "url": url,
            "title": article.title,
            "authors": article.authors,
            "publish_date": article.publish_date,
            "summary": summary_sentences,
            "keywords": article.keywords,
            "full_text": article.text[:1000] + "..." if len(article.text) > 1000 else article.text,
            "method": "newspaper3k"
        }
    
    def _summarize_with_sumy(self, url: str, sentences: int) -> Dict[str, any]:
        """Use Sumy for advanced summarization"""
        # Parse the article
        parser = HtmlParser.from_url(url, Tokenizer(self.language))
        
        # Create summarizer (LexRank is good for news)
        stemmer = Stemmer(self.language)
        summarizer = LexRankSummarizer(stemmer)
        summarizer.stop_words = get_stop_words(self.language)
        
        # Generate summary
        summary_sentences = summarizer(parser.document, sentences)
        
        # Extract title if available
        title = parser.document.title if hasattr(parser.document, 'title') else None
        
        return {
            "url": url,
            "title": title,
            "summary": [str(sentence) for sentence in summary_sentences],
            "method": "sumy_lexrank"
        }
    
    def _summarize_with_nltk(self, url: str, sentences: int) -> Dict[str, any]:
        """Use NLTK with custom frequency-based summarization"""
        # Fetch and parse HTML
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title = soup.find('title').text if soup.find('title') else None
        
        # Extract article text
        article_text = ""
        for p in soup.find_all(['p', 'article']):
            article_text += p.text + " "
        
        # Clean text
        article_text = article_text.strip()
        
        # Tokenize
        sentences_list = sent_tokenize(article_text)
        
        # Calculate word frequencies
        word_frequencies = {}
        for word in word_tokenize(article_text.lower()):
            if word not in self.stop_words and word.isalnum():
                if word not in word_frequencies:
                    word_frequencies[word] = 1
                else:
                    word_frequencies[word] += 1
        
        # Normalize frequencies
        maximum_frequency = max(word_frequencies.values()) if word_frequencies else 1
        for word in word_frequencies:
            word_frequencies[word] = word_frequencies[word] / maximum_frequency
        
        # Calculate sentence scores
        sentence_scores = {}
        for sent in sentences_list:
            words = word_tokenize(sent.lower())
            for word in words:
                if word in word_frequencies:
                    if len(sent.split(' ')) < 30:  # Ignore very long sentences
                        if sent not in sentence_scores:
                            sentence_scores[sent] = word_frequencies[word]
                        else:
                            sentence_scores[sent] += word_frequencies[word]
        
        # Get top sentences
        summary_sentences = heapq.nlargest(sentences, sentence_scores, key=sentence_scores.get)
        
        return {
            "url": url,
            "title": title,
            "summary": summary_sentences,
            "method": "nltk_frequency"
        }
    
    def _basic_extraction(self, url: str, sentences: int) -> Dict[str, any]:
        """Basic extraction without NLP libraries"""
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.find('title').text if soup.find('title') else None
        
        # Extract paragraphs
        paragraphs = []
        for p in soup.find_all('p'):
            text = p.text.strip()
            if len(text) > 50:  # Filter out short paragraphs
                paragraphs.append(text)
        
        # Simple summary: first N sentences
        all_text = ' '.join(paragraphs[:10])  # First 10 paragraphs
        simple_sentences = all_text.split('. ')[:sentences]
        
        return {
            "url": url,
            "title": title,
            "summary": [s + '.' for s in simple_sentences if s],
            "method": "basic_extraction"
        }
    
    def summarize_commodity_news(self, url: str, commodity: str = None) -> Dict[str, any]:
        """
        Specialized summarization for commodity news
        Extracts commodity-specific information
        """
        # Get base summary
        result = self.summarize_url(url, sentences=5)
        
        if 'error' in result:
            return result
        
        # Add commodity-specific analysis
        commodity_keywords = {
            "oil": ["barrel", "crude", "opec", "production", "drilling", "petroleum"],
            "gold": ["ounce", "mining", "bullion", "precious metal", "reserve"],
            "wheat": ["bushel", "harvest", "grain", "crop", "yield", "agriculture"],
            "gas": ["natural gas", "lng", "pipeline", "mcf", "energy"]
        }
        
        # Check for commodity mentions
        summary_text = ' '.join(result.get('summary', []))
        mentioned_commodities = []
        
        for comm, keywords in commodity_keywords.items():
            if any(keyword in summary_text.lower() for keyword in keywords):
                mentioned_commodities.append(comm)
        
        result['commodities_mentioned'] = mentioned_commodities
        result['is_commodity_specific'] = commodity and commodity.lower() in mentioned_commodities
        
        return result

# Example usage functions
def summarize_financial_article(url: str) -> Dict[str, any]:
    """Quick function to summarize a financial article"""
    summarizer = ArticleSummarizer()
    return summarizer.summarize_url(url, sentences=5)

def get_commodity_news_summary(url: str, commodity: str) -> Dict[str, any]:
    """Get commodity-specific summary"""
    summarizer = ArticleSummarizer()
    return summarizer.summarize_commodity_news(url, commodity)

# Example with fallback for when libraries aren't installed
if __name__ == "__main__":
    # Test URL
    test_url = "https://www.reuters.com/markets/commodities/"
    
    summarizer = ArticleSummarizer()
    
    print(f"Available methods:")
    print(f"- NLTK: {NLTK_AVAILABLE}")
    print(f"- Sumy: {SUMY_AVAILABLE}")
    print(f"- Newspaper3k: {NEWSPAPER_AVAILABLE}")
    
    # Test summarization
    result = summarizer.summarize_url(test_url, sentences=3)
    
    print(f"\nSummary using {result.get('method', 'unknown')}:")
    print(f"Title: {result.get('title', 'N/A')}")
    print(f"Summary:")
    for i, sentence in enumerate(result.get('summary', []), 1):
        print(f"{i}. {sentence}")
