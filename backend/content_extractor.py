"""
HTML Content Extraction and NLTK Summarization Utility
Provides functions to fetch full article content and generate summaries
"""

import aiohttp
import asyncio
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Optional, List, Dict
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter, defaultdict
import string
from datetime import datetime

logger = logging.getLogger(__name__)

class ContentExtractor:
    """Handles full HTML content extraction and text processing"""
    
    def __init__(self):
        self.session = None
        self.stopwords = set(stopwords.words('english')) if nltk.data.find('corpora/stopwords') else set()
        
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=3)
        timeout = aiohttp.ClientTimeout(total=15, connect=5)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def fetch_article_content(self, url: str) -> Dict[str, str]:
        """
        Fetch full HTML content from article URL and extract text
        
        Args:
            url: Article URL to fetch
            
        Returns:
            Dict containing extracted content
        """
        try:
            if not self.session:
                raise Exception("ContentExtractor not initialized as context manager")
            
            logger.info(f"Fetching full content from: {url}")
            
            async with self.session.get(url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {url}: HTTP {response.status}")
                    return {"error": f"HTTP {response.status}", "content": "", "title": ""}
                
                html_content = await response.text()
                
                # Parse HTML with BeautifulSoup
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extract title
                title = self._extract_title(soup)
                
                # Extract main article content
                article_text = self._extract_article_text(soup)
                
                if not article_text.strip():
                    logger.warning(f"No content extracted from {url}")
                    return {"error": "No content found", "content": "", "title": title}
                
                logger.info(f"Successfully extracted {len(article_text)} characters from {url}")
                
                return {
                    "content": article_text,
                    "title": title,
                    "url": url,
                    "word_count": len(article_text.split()),
                    "extraction_time": datetime.now().isoformat()
                }
                
        except asyncio.TimeoutError:
            logger.error(f"Timeout fetching content from {url}")
            return {"error": "Timeout", "content": "", "title": ""}
        except Exception as e:
            logger.error(f"Error fetching content from {url}: {e}")
            return {"error": str(e), "content": "", "title": ""}
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract article title from HTML"""
        # Try multiple title selectors
        title_selectors = [
            'h1',
            '[data-testid="headline"]',
            '.headline',
            '.article-title',
            'h1.entry-title',
            'title'
        ]
        
        for selector in title_selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        
        return "Unknown Title"
    
    def _extract_article_text(self, soup: BeautifulSoup) -> str:
        """Extract main article text content from HTML"""
        # Remove unwanted elements
        unwanted_tags = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'menu']
        for tag in unwanted_tags:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Try common article content selectors
        article_selectors = [
            'article',
            '[data-testid="ArticleBody"]',
            '.article-body',
            '.entry-content', 
            '.post-content',
            '.content',
            'main',
            '.story-body',
            '.article-content'
        ]
        
        content_text = ""
        
        # Try each selector until we find substantial content
        for selector in article_selectors:
            elements = soup.select(selector)
            if elements:
                for element in elements:
                    text = element.get_text(separator=' ', strip=True)
                    if len(text) > len(content_text):
                        content_text = text
        
        # Fallback: extract from body tag
        if not content_text.strip() or len(content_text) < 200:
            body = soup.find('body')
            if body:
                # Remove navigation and other non-content areas
                for nav in body.find_all(['nav', 'header', 'footer', 'aside']):
                    nav.decompose()
                
                paragraphs = body.find_all('p')
                content_text = ' '.join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20])
        
        # Clean up text
        content_text = re.sub(r'\s+', ' ', content_text)
        content_text = content_text.strip()
        
        return content_text

class NLTKSummarizer:
    """NLTK-based text summarization using frequency analysis"""
    
    def __init__(self):
        self.stopwords = set(stopwords.words('english')) if nltk.data.find('corpora/stopwords') else set()
        self.stopwords.update(set(string.punctuation))
    
    def summarize_text(self, text: str, num_sentences: int = 3, focus_keywords: Optional[List[str]] = None) -> Dict[str, any]:
        """
        Create a summary using NLTK's frequency-based approach
        
        Args:
            text: Input text to summarize
            num_sentences: Number of sentences in summary
            focus_keywords: Keywords to emphasize (e.g., commodity terms)
            
        Returns:
            Dictionary containing summary and metadata
        """
        try:
            if not text or len(text.strip()) < 50:
                return {
                    "summary": text.strip(),
                    "method": "nltk_frequency",
                    "sentences_original": 0,
                    "sentences_summary": 0,
                    "compression_ratio": 1.0
                }
            
            # Tokenize into sentences
            sentences = sent_tokenize(text)
            
            if len(sentences) <= num_sentences:
                return {
                    "summary": text.strip(),
                    "method": "nltk_frequency", 
                    "sentences_original": len(sentences),
                    "sentences_summary": len(sentences),
                    "compression_ratio": 1.0
                }
            
            # Calculate word frequencies
            word_freq = self._calculate_word_frequencies(text, focus_keywords)
            
            # Score sentences based on word frequencies
            sentence_scores = self._score_sentences(sentences, word_freq)
            
            # Select top sentences
            top_sentences = self._select_top_sentences(sentences, sentence_scores, num_sentences)
            
            summary = ' '.join(top_sentences)
            
            return {
                "summary": summary,
                "method": "nltk_frequency",
                "sentences_original": len(sentences),
                "sentences_summary": len(top_sentences),
                "compression_ratio": len(top_sentences) / len(sentences),
                "focus_keywords_used": focus_keywords or []
            }
            
        except Exception as e:
            logger.error(f"Error in NLTK summarization: {e}")
            return {
                "summary": text[:500] + "..." if len(text) > 500 else text,
                "method": "fallback_truncation",
                "error": str(e)
            }
    
    def _calculate_word_frequencies(self, text: str, focus_keywords: Optional[List[str]] = None) -> Dict[str, float]:
        """Calculate word frequencies with optional keyword boosting"""
        words = word_tokenize(text.lower())
        
        # Filter out stopwords and punctuation
        filtered_words = [word for word in words 
                         if word not in self.stopwords and 
                         word.isalnum() and 
                         len(word) > 2]
        
        # Calculate base frequencies
        word_freq = Counter(filtered_words)
        
        # Normalize frequencies
        max_freq = max(word_freq.values()) if word_freq else 1
        normalized_freq = {word: freq / max_freq for word, freq in word_freq.items()}
        
        # Boost focus keywords if provided
        if focus_keywords:
            for keyword in focus_keywords:
                keyword_lower = keyword.lower()
                if keyword_lower in normalized_freq:
                    normalized_freq[keyword_lower] *= 1.5  # Boost by 50%
                
                # Also boost related words
                for word in normalized_freq:
                    if keyword_lower in word or word in keyword_lower:
                        normalized_freq[word] *= 1.2  # Boost by 20%
        
        return normalized_freq
    
    def _score_sentences(self, sentences: List[str], word_freq: Dict[str, float]) -> Dict[int, float]:
        """Score sentences based on word frequencies"""
        sentence_scores = {}
        
        for i, sentence in enumerate(sentences):
            words = word_tokenize(sentence.lower())
            filtered_words = [word for word in words 
                             if word not in self.stopwords and 
                             word.isalnum()]
            
            if not filtered_words:
                sentence_scores[i] = 0
                continue
            
            # Calculate sentence score as average word frequency
            sentence_score = sum(word_freq.get(word, 0) for word in filtered_words)
            sentence_score = sentence_score / len(filtered_words)
            
            # Bonus for sentences with numbers (often important in financial news)
            if any(word.isdigit() or '%' in sentence for word in words):
                sentence_score *= 1.1
            
            # Bonus for sentences at beginning (often contain key info)
            if i < len(sentences) * 0.3:
                sentence_score *= 1.05
            
            sentence_scores[i] = sentence_score
        
        return sentence_scores
    
    def _select_top_sentences(self, sentences: List[str], sentence_scores: Dict[int, float], num_sentences: int) -> List[str]:
        """Select top scoring sentences while maintaining order"""
        # Get top sentence indices by score
        top_indices = sorted(sentence_scores.keys(), 
                           key=lambda x: sentence_scores[x], 
                           reverse=True)[:num_sentences]
        
        # Sort indices to maintain original order
        top_indices.sort()
        
        return [sentences[i] for i in top_indices]

# Commodity-specific keyword lists for enhanced summarization
COMMODITY_KEYWORDS = {
    'oil': ['crude', 'petroleum', 'barrel', 'opec', 'brent', 'wti', 'refinery', 'drilling'],
    'gas': ['natural gas', 'lng', 'pipeline', 'bcf', 'mcf', 'henry hub'],
    'gold': ['bullion', 'ounce', 'troy', 'mining', 'precious metal', 'fed', 'inflation'],
    'wheat': ['grain', 'harvest', 'bushel', 'crop', 'agriculture', 'export'],
    'corn': ['maize', 'ethanol', 'feed', 'acres', 'yield', 'usda'],
    'copper': ['mining', 'industrial', 'construction', 'china', 'supply'],
    'silver': ['precious metal', 'industrial', 'mining', 'ounce']
}

def get_commodity_keywords(commodity: Optional[str]) -> List[str]:
    """Get relevant keywords for a specific commodity"""
    if not commodity:
        return []
    
    commodity_lower = commodity.lower()
    return COMMODITY_KEYWORDS.get(commodity_lower, [])
