"""
HTML Content Extraction and NLTK Summarization Utility
Provides functions to fetch full article content and generate summaries
"""

import aiohttp
import asyncio
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Optional, List, Dict, Union
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter, defaultdict
import string
from datetime import datetime
import socket
from aiohttp import TCPConnector, ClientTimeout, AsyncResolver, ClientSession, ClientError
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class ContentExtractor:
    """Handles full HTML content extraction and text processing"""
    
    def __init__(self):
        self.session = None
        self.stopwords = set(stopwords.words('english')) if nltk.data.find('corpora/stopwords') else set()
        
    async def __aenter__(self):
        """Async context manager entry with robust connection handling"""
        # Configure DNS settings and timeouts
        resolver = AsyncResolver(nameservers=["8.8.8.8", "8.8.4.4"])  # Use Google DNS
        self.connector = TCPConnector(
            limit=10,
            limit_per_host=3,
            resolver=resolver,
            family=socket.AF_INET,  # IPv4 only for better compatibility
            ssl=False,  # Handle SSL in request
            force_close=True,  # Avoid stale connections
            enable_cleanup_closed=True
        )
        
        timeout = ClientTimeout(total=30, connect=10, sock_connect=10)
        self.session = ClientSession(
            connector=self.connector,
            timeout=timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def fetch_with_retry(self, url: str, verify_ssl: bool = True) -> str:
        """Fetch content with retry logic for transient failures"""
        try:
            async with self.session.get(url, ssl=verify_ssl) as response:
                if response.status == 200:
                    return await response.text()
                elif response.status == 429:  # Rate limited
                    retry_after = int(response.headers.get('Retry-After', 5))
                    await asyncio.sleep(retry_after)
                    raise ClientError(f"Rate limited: retry after {retry_after}s")
                else:
                    raise ClientError(f"HTTP {response.status}")
        except ClientError as e:
            logger.warning(f"Retry needed for {url}: {e}")
            raise  # Let retry decorator handle it
        except Exception as e:
            logger.error(f"Fatal error fetching {url}: {e}")
            raise

    async def fetch_article_content(self, url: str) -> Dict[str, Union[str, int, dict]]:
        """Fetch and extract article content with error handling and retries"""
        try:
            if not self.session:
                raise Exception("ContentExtractor not initialized as context manager")
            
            logger.info(f"Fetching content from: {url}")
            
            # Try with SSL verification first
            try:
                html_content = await self.fetch_with_retry(url)
            except Exception as ssl_error:
                # If SSL fails, try without verification
                logger.warning(f"SSL verification failed for {url}, retrying without verification")
                html_content = await self.fetch_with_retry(url, verify_ssl=False)
            
            # Parse HTML with error handling
            try:
                soup = BeautifulSoup(html_content, 'html.parser')
            except Exception as parse_error:
                logger.error(f"HTML parsing failed for {url}: {parse_error}")
                return {
                    "error": "Invalid HTML content",
                    "content": "",
                    "title": "",
                    "technical_details": str(parse_error)
                }
            
            # Extract content
            title = self._extract_title(soup)
            article_text = self._extract_article_text(soup)
            
            if not article_text.strip():
                logger.warning(f"No content extracted from {url}")
                return {
                    "error": "No content found",
                    "content": "",
                    "title": title,
                    "url": url,
                    "extraction_time": datetime.now().isoformat()
                }
            
            # Clean and normalize content
            article_text = self._normalize_content(article_text)
            
            logger.info(f"Successfully extracted {len(article_text)} chars from {url}")
            
            return {
                "content": article_text,
                "title": title,
                "url": url,
                "word_count": len(article_text.split()),
                "extraction_time": datetime.now().isoformat(),
                "metadata": {
                    "source_domain": urlparse(url).netloc,
                    "content_length": len(article_text),
                    "extraction_success": True
                }
            }
            
        except asyncio.TimeoutError as e:
            logger.error(f"Timeout fetching content from {url}: {e}")
            return self._create_error_response("Timeout", url)
        except ClientError as e:
            logger.error(f"Client error for {url}: {e}")
            return self._create_error_response(str(e), url)
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            return self._create_error_response(str(e), url)
    
    def _normalize_content(self, text: str) -> str:
        """Clean and normalize extracted content"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove common noise patterns
        text = re.sub(r'\[\d+\]', '', text)  # Remove reference numbers
        text = re.sub(r'Share\s+this\s+article', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Subscribe\s+to\s+our\s+newsletter', '', text, flags=re.IGNORECASE)
        return text.strip()
    
    def _create_error_response(self, error_msg: str, url: str) -> Dict[str, Union[str, dict]]:
        """Create standardized error response"""
        return {
            "error": error_msg,
            "content": "",
            "title": "",
            "url": url,
            "extraction_time": datetime.now().isoformat(),
            "metadata": {
                "source_domain": urlparse(url).netloc,
                "extraction_success": False,
                "error_type": error_msg
            }
        }
    
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
