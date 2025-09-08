"""
Response Processor using NLTK for concise, focused AI responses
Integrates summarization, sentiment analysis, and key point extraction
"""

import re
import nltk
from typing import Dict, List, Optional, Tuple
from collections import Counter
import logging

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
except:
    pass

from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk import pos_tag
import numpy as np

logger = logging.getLogger(__name__)

class ResponseProcessor:
    """Process and summarize AI responses for conciseness"""
    
    def __init__(self):
        self.sia = SentimentIntensityAnalyzer()
        self.stop_words = set(stopwords.words('english'))
        
        # Key financial terms to preserve
        self.key_terms = {
            'bullish', 'bearish', 'neutral', 'volatility', 'support', 'resistance',
            'trend', 'breakout', 'reversal', 'momentum', 'volume', 'liquidity',
            'supply', 'demand', 'inflation', 'deflation', 'yield', 'spread',
            'futures', 'options', 'commodity', 'crude', 'gold', 'wheat', 'corn',
            'opec', 'fed', 'ecb', 'rate', 'hike', 'cut', 'policy', 'geopolitical'
        }
        
        # Sentiment drivers for commodities
        self.sentiment_drivers = {
            'positive': ['surge', 'rally', 'gain', 'rise', 'increase', 'boost', 
                        'strengthen', 'recover', 'uptick', 'breakout', 'support'],
            'negative': ['fall', 'drop', 'decline', 'decrease', 'plunge', 'crash',
                        'weaken', 'slump', 'downturn', 'selloff', 'pressure'],
            'neutral': ['stable', 'steady', 'unchanged', 'flat', 'consolidate',
                       'range-bound', 'sideways', 'mixed', 'balanced']
        }
    
    def process_response(self, 
                        raw_response: str, 
                        max_bullets: int = 5,
                        preserve_sources: bool = True) -> Dict:
        """
        Process raw AI response into structured, professional format
        
        Args:
            raw_response: Raw text from Groq AI
            max_bullets: Maximum number of bullet points
            preserve_sources: Keep source citations
            
        Returns:
            Processed response with layered analysis
        """
        
        # Clean and prepare text
        cleaned_text = self._clean_text(raw_response, preserve_sources)
        
        # Extract sentences
        sentences = sent_tokenize(cleaned_text)
        
        # Score sentences for importance
        scored_sentences = self._score_sentences(sentences)
        
        # Create layered analysis
        sentiment_overview = self._create_sentiment_overview(cleaned_text, scored_sentences)
        
        # Extract main points (2-3 primary, 2-3 supporting)
        primary_points = self._extract_primary_points(scored_sentences, 3)
        supporting_points = self._extract_supporting_points(scored_sentences, primary_points, 3)
        
        # Extract market drivers with context
        contextual_drivers = self._extract_contextual_drivers(cleaned_text, sentences)
        
        # Analyze overall sentiment with nuance
        sentiment_analysis = self._analyze_layered_sentiment(cleaned_text, sentences)
        
        # Extract key statistics and numbers
        statistics = self._extract_statistics(cleaned_text)
        
        # Format into professional response
        return {
            "sentiment_overview": sentiment_overview,
            "primary_analysis": primary_points,
            "supporting_insights": supporting_points,
            "sentiment": sentiment_analysis,
            "market_drivers": contextual_drivers,
            "key_metrics": statistics,
            "metadata": {
                "word_count": len(cleaned_text.split()),
                "clarity_score": self._calculate_clarity(primary_points, supporting_points),
                "processing": "NLTK-layered"
            }
        }
    
    def _clean_text(self, text: str, preserve_sources: bool) -> str:
        """Clean and normalize text"""
        # Remove markdown formatting
        text = re.sub(r'\*{2,}', '', text)
        text = re.sub(r'#{2,}\s*', '', text)
        text = re.sub(r'\|+', ' ', text)
        text = re.sub(r'-{4,}', '', text)
        
        # Preserve sources if requested
        if not preserve_sources:
            text = re.sub(r'\[.*?\]', '', text)
            text = re.sub(r'\(.*?source.*?\)', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def _score_sentences(self, sentences: List[str]) -> List[Tuple[str, float]]:
        """Score sentences based on importance"""
        scored = []
        
        for sentence in sentences:
            score = 0.0
            words = word_tokenize(sentence.lower())
            
            # Score based on key terms
            key_term_count = sum(1 for word in words if word in self.key_terms)
            score += key_term_count * 2.0
            
            # Score based on numbers/statistics
            number_count = len(re.findall(r'\d+\.?\d*%?', sentence))
            score += number_count * 1.5
            
            # Score based on position (earlier sentences slightly preferred)
            position_score = 1.0 / (sentences.index(sentence) + 1)
            score += position_score * 0.5
            
            # Score based on length (prefer medium-length sentences)
            word_count = len(words)
            if 10 <= word_count <= 25:
                score += 1.0
            elif word_count > 25:
                score -= 0.5
            
            # Score based on sentiment drivers
            for driver_words in self.sentiment_drivers.values():
                if any(driver in sentence.lower() for driver in driver_words):
                    score += 1.5
            
            scored.append((sentence, score))
        
        # Sort by score
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored
    
    def _extract_key_points(self, 
                           scored_sentences: List[Tuple[str, float]], 
                           max_points: int) -> List[str]:
        """Extract top key points"""
        key_points = []
        
        for sentence, score in scored_sentences[:max_points]:
            # Simplify sentence if too long
            if len(sentence.split()) > 30:
                sentence = self._simplify_sentence(sentence)
            
            # Remove redundant phrases
            sentence = self._remove_redundancy(sentence)
            
            key_points.append(sentence)
        
        return key_points
    
    def _simplify_sentence(self, sentence: str) -> str:
        """Simplify a long sentence"""
        # Remove parenthetical phrases
        sentence = re.sub(r'\([^)]*\)', '', sentence)
        
        # Remove "which/that" clauses if sentence is still long
        if len(sentence.split()) > 25:
            sentence = re.sub(r',\s*which[^,]*,', ',', sentence)
            sentence = re.sub(r',\s*that[^,]*,', ',', sentence)
        
        return sentence.strip()
    
    def _remove_redundancy(self, sentence: str) -> str:
        """Remove redundant phrases"""
        redundant_phrases = [
            'it is important to note that',
            'it should be noted that',
            'it is worth mentioning that',
            'as mentioned earlier',
            'as previously stated',
            'in other words',
            'that being said',
            'having said that',
            'to put it simply',
            'in summary',
            'in conclusion'
        ]
        
        for phrase in redundant_phrases:
            sentence = sentence.lower().replace(phrase, '')
        
        # Capitalize first letter
        if sentence:
            sentence = sentence[0].upper() + sentence[1:]
        
        return sentence.strip()
    
    def _extract_sentiment_drivers(self, text: str) -> Dict[str, List[str]]:
        """Extract key sentiment drivers from text"""
        drivers = {
            'positive': [],
            'negative': [],
            'neutral': []
        }
        
        text_lower = text.lower()
        sentences = sent_tokenize(text)
        
        for category, words in self.sentiment_drivers.items():
            for word in words:
                if word in text_lower:
                    # Find context around the word
                    for sentence in sentences:
                        if word in sentence.lower():
                            # Extract key phrase around the driver
                            context = self._extract_context(sentence, word)
                            if context and context not in drivers[category]:
                                drivers[category].append(context)
                            break
        
        # Limit to top 3 drivers per category
        for category in drivers:
            drivers[category] = drivers[category][:3]
        
        return drivers
    
    def _extract_context(self, sentence: str, keyword: str) -> Optional[str]:
        """Extract meaningful context around a keyword"""
        words = sentence.split()
        keyword_lower = keyword.lower()
        
        for i, word in enumerate(words):
            if keyword_lower in word.lower():
                # Get 2-3 words before and after
                start = max(0, i - 2)
                end = min(len(words), i + 3)
                context = ' '.join(words[start:end])
                
                # Clean up
                context = re.sub(r'[,.]$', '', context)
                return context
        
        return None
    
    def _analyze_sentiment(self, text: str) -> Dict:
        """Analyze overall sentiment of text"""
        scores = self.sia.polarity_scores(text)
        
        # Determine primary sentiment
        if scores['compound'] >= 0.05:
            sentiment = 'BULLISH'
            confidence = min(abs(scores['compound']) * 100, 95)
        elif scores['compound'] <= -0.05:
            sentiment = 'BEARISH'
            confidence = min(abs(scores['compound']) * 100, 95)
        else:
            sentiment = 'NEUTRAL'
            confidence = 70
        
        return {
            'sentiment': sentiment,
            'confidence': round(confidence),
            'scores': {
                'positive': round(scores['pos'], 3),
                'negative': round(scores['neg'], 3),
                'neutral': round(scores['neu'], 3),
                'compound': round(scores['compound'], 3)
            }
        }
    
    def _extract_statistics(self, text: str) -> List[str]:
        """Extract key statistics and numbers"""
        statistics = []
        
        # Find percentages
        percentages = re.findall(r'(\d+\.?\d*%)', text)
        for pct in percentages[:3]:  # Limit to 3
            # Find context
            for sentence in sent_tokenize(text):
                if pct in sentence:
                    # Extract key phrase
                    words = sentence.split()
                    for i, word in enumerate(words):
                        if pct in word:
                            start = max(0, i - 3)
                            end = min(len(words), i + 2)
                            stat = ' '.join(words[start:end])
                            statistics.append(stat)
                            break
                    break
        
        # Find price levels
        prices = re.findall(r'\$\d+\.?\d*', text)
        for price in prices[:2]:  # Limit to 2
            for sentence in sent_tokenize(text):
                if price in sentence:
                    # Extract commodity and action
                    match = re.search(rf'(\w+\s+){{1,3}}{re.escape(price)}', sentence)
                    if match:
                        statistics.append(match.group(0))
                    break
        
        return statistics[:5]  # Maximum 5 statistics
    
    def _create_summary(self, key_points: List[str]) -> str:
        """Create a concise summary from key points"""
        if not key_points:
            return "No significant information to summarize."
        
        # Take first 2-3 key points for ultra-concise summary
        summary_points = key_points[:min(3, len(key_points))]
        
        # Join with appropriate connectors
        if len(summary_points) == 1:
            return summary_points[0]
        elif len(summary_points) == 2:
            return f"{summary_points[0]} Additionally, {summary_points[1].lower()}"
        else:
            return f"{summary_points[0]} {summary_points[1]} Furthermore, {summary_points[2].lower()}"
    
    def _calculate_reduction(self, original: str, processed: List[str]) -> float:
        """Calculate text reduction rate"""
        original_words = len(original.split())
        processed_words = sum(len(p.split()) for p in processed)
        
        if original_words == 0:
            return 0.0
        
        reduction = (1 - processed_words / original_words) * 100
        return round(reduction, 1)
    
    def _create_sentiment_overview(self, text: str, scored_sentences: List[Tuple[str, float]]) -> str:
        """
        Create high-level sentiment overview with nuanced tone
        """
        # Analyze overall tone
        sentiment_scores = self.sia.polarity_scores(text)
        
        # Determine primary tone
        if sentiment_scores['compound'] > 0.3:
            primary_tone = "Bullish"
        elif sentiment_scores['compound'] < -0.3:
            primary_tone = "Bearish"
        else:
            primary_tone = "Neutral"
            
        # Identify secondary tone from top sentences
        top_sentences = [s[0] for s in sorted(scored_sentences, key=lambda x: x[1], reverse=True)[:3]]
        secondary_tone = self._identify_secondary_tone(" ".join(top_sentences))
        
        return f"{primary_tone} sentiment with {secondary_tone} undertones"
    
    def _identify_secondary_tone(self, text: str) -> str:
        """
        Identify secondary market tone
        """
        cautious_terms = ['concern', 'risk', 'uncertainty', 'volatile', 'caution', 'worry', 'fear']
        optimistic_terms = ['growth', 'opportunity', 'recovery', 'positive', 'momentum', 'rally', 'surge']
        measured_terms = ['stable', 'steady', 'balanced', 'moderate', 'maintain']
        
        text_lower = text.lower()
        cautious_count = sum(1 for term in cautious_terms if term in text_lower)
        optimistic_count = sum(1 for term in optimistic_terms if term in text_lower)
        measured_count = sum(1 for term in measured_terms if term in text_lower)
        
        max_count = max(cautious_count, optimistic_count, measured_count)
        
        if max_count == 0:
            return "mixed"
        elif cautious_count == max_count:
            return "cautious"
        elif optimistic_count == max_count:
            return "optimistic"
        else:
            return "measured"
    
    def _extract_primary_points(self, scored_sentences: List[Tuple[str, float]], 
                               max_points: int = 3) -> List[str]:
        """
        Extract 2-3 primary high-impact points
        """
        # Sort by score
        sorted_sentences = sorted(scored_sentences, key=lambda x: x[1], reverse=True)
        
        # Take top sentences with high scores
        primary_points = []
        seen_topics = set()
        
        for sentence, score in sorted_sentences:
            cleaned = sentence.strip()
            # Extract key topic to avoid duplication
            topic_words = set(word.lower() for word in word_tokenize(cleaned) 
                             if word.lower() in self.key_terms)
            
            # Check if this is a new topic and has good score
            if topic_words and not topic_words.issubset(seen_topics) and score > 2.0:
                seen_topics.update(topic_words)
                
                # Simplify if needed
                if len(cleaned.split()) > 30:
                    cleaned = self._simplify_sentence(cleaned)
                
                # Format as primary point
                if not cleaned.startswith(('•', '-', '*')):
                    cleaned = f"• {cleaned}"
                primary_points.append(cleaned)
                
                if len(primary_points) >= max_points:
                    break
        
        return primary_points
    
    def _extract_supporting_points(self, scored_sentences: List[Tuple[str, float]], 
                                  primary_points: List[str], max_points: int = 3) -> List[str]:
        """
        Extract supporting points that complement primary analysis
        """
        # Get text from primary points for comparison
        primary_text = " ".join(p.lower() for p in primary_points)
        primary_words = set(word_tokenize(primary_text))
        
        supporting = []
        for sentence, score in scored_sentences:
            sentence_words = set(word_tokenize(sentence.lower()))
            
            # Look for complementary but not duplicate content
            overlap = len(primary_words & sentence_words) / len(sentence_words) if sentence_words else 0
            
            if 0.2 < overlap < 0.7 and score > 1.0:  # Some overlap but not duplicate
                cleaned = sentence.strip()
                
                # Simplify if needed
                if len(cleaned.split()) > 25:
                    cleaned = self._simplify_sentence(cleaned)
                
                if cleaned and len(cleaned.split()) > 5:
                    # Format with indentation for hierarchy
                    if not cleaned.startswith(('•', '-', '*', '◦')):
                        cleaned = f"  ◦ {cleaned}"
                    supporting.append(cleaned)
                    
                if len(supporting) >= max_points:
                    break
                
        return supporting
    
    def _extract_contextual_drivers(self, text: str, sentences: List[str]) -> Dict[str, List[str]]:
        """
        Extract market drivers with rich context
        """
        drivers = {
            'bullish_factors': [],
            'bearish_factors': [],
            'key_considerations': []
        }
        
        text_lower = text.lower()
        
        # Bullish indicators
        bullish_patterns = [
            (r'growth of \d+\.?\d*%', 'growth'),
            (r'increased? by \d+\.?\d*%', 'increase'),
            (r'surge[d]? \d+\.?\d*%', 'surge'),
            (r'recover[y|ed|ing]', 'recovery'),
            (r'momentum', 'momentum')
        ]
        
        # Bearish indicators
        bearish_patterns = [
            (r'decline[d]? \d+\.?\d*%', 'decline'),
            (r'fell \d+\.?\d*%', 'drop'),
            (r'concern[s]? about', 'concerns'),
            (r'risk[s]? of', 'risks'),
            (r'uncertainty', 'uncertainty')
        ]
        
        # Extract bullish factors
        for pattern, label in bullish_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                # Find the sentence containing this match
                for sent in sentences:
                    if match.group() in sent.lower():
                        context = self._extract_driver_context(sent, match.group())
                        if context and len(drivers['bullish_factors']) < 3:
                            drivers['bullish_factors'].append(context)
                        break
        
        # Extract bearish factors
        for pattern, label in bearish_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                for sent in sentences:
                    if match.group() in sent.lower():
                        context = self._extract_driver_context(sent, match.group())
                        if context and len(drivers['bearish_factors']) < 3:
                            drivers['bearish_factors'].append(context)
                        break
        
        # Extract key considerations (neutral but important)
        consideration_terms = ['volatility', 'outlook', 'forecast', 'expectation', 'projection']
        for term in consideration_terms:
            if term in text_lower:
                for sent in sentences:
                    if term in sent.lower() and len(drivers['key_considerations']) < 2:
                        context = self._extract_driver_context(sent, term)
                        if context:
                            drivers['key_considerations'].append(context)
                        break
        
        return drivers
    
    def _extract_driver_context(self, sentence: str, keyword: str) -> Optional[str]:
        """
        Extract meaningful driver context
        """
        # Clean the sentence
        cleaned = self._remove_redundancy(sentence.strip())
        
        # If sentence is too long, extract relevant portion
        if len(cleaned.split()) > 20:
            words = cleaned.split()
            keyword_idx = -1
            for i, word in enumerate(words):
                if keyword.lower() in word.lower():
                    keyword_idx = i
                    break
            
            if keyword_idx >= 0:
                start = max(0, keyword_idx - 5)
                end = min(len(words), keyword_idx + 10)
                cleaned = ' '.join(words[start:end])
        
        return cleaned if len(cleaned) > 10 else None
    
    def _analyze_layered_sentiment(self, text: str, sentences: List[str]) -> Dict:
        """
        Analyze sentiment with multiple layers of nuance
        """
        # Overall sentiment
        overall_scores = self.sia.polarity_scores(text)
        
        # Sentence-level sentiment distribution
        sent_sentiments = {'positive': 0, 'negative': 0, 'neutral': 0}
        for sentence in sentences:
            scores = self.sia.polarity_scores(sentence)
            if scores['compound'] > 0.1:
                sent_sentiments['positive'] += 1
            elif scores['compound'] < -0.1:
                sent_sentiments['negative'] += 1
            else:
                sent_sentiments['neutral'] += 1
        
        # Determine overall sentiment with confidence
        total_sentences = len(sentences)
        if overall_scores['compound'] >= 0.05:
            primary_sentiment = 'BULLISH'
            confidence = min(abs(overall_scores['compound']) * 100, 95)
        elif overall_scores['compound'] <= -0.05:
            primary_sentiment = 'BEARISH'
            confidence = min(abs(overall_scores['compound']) * 100, 95)
        else:
            primary_sentiment = 'NEUTRAL'
            confidence = 70
        
        # Determine sentiment trend
        if total_sentences > 3:
            early_sentiment = self.sia.polarity_scores(' '.join(sentences[:total_sentences//2]))['compound']
            late_sentiment = self.sia.polarity_scores(' '.join(sentences[total_sentences//2:]))['compound']
            
            if late_sentiment > early_sentiment + 0.1:
                trend = 'improving'
            elif late_sentiment < early_sentiment - 0.1:
                trend = 'deteriorating'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        return {
            'primary': primary_sentiment,
            'confidence': round(confidence),
            'trend': trend,
            'distribution': sent_sentiments,
            'scores': {
                'positive': round(overall_scores['pos'], 3),
                'negative': round(overall_scores['neg'], 3),
                'neutral': round(overall_scores['neu'], 3),
                'compound': round(overall_scores['compound'], 3)
            }
        }
    
    def _calculate_clarity(self, primary_points: List[str], supporting_points: List[str]) -> float:
        """
        Calculate clarity score of the analysis
        """
        # Check if we have good structure
        has_primary = len(primary_points) >= 2
        has_supporting = len(supporting_points) >= 1
        
        # Check length appropriateness
        avg_primary_length = sum(len(p.split()) for p in primary_points) / len(primary_points) if primary_points else 0
        good_length = 10 <= avg_primary_length <= 25
        
        # Calculate score
        score = 0
        if has_primary:
            score += 40
        if has_supporting:
            score += 30
        if good_length:
            score += 30
        
        return min(score, 100)

# Integration function for Groq AI responses
async def process_groq_response(raw_response: str, 
                               commodity: Optional[str] = None,
                               max_bullets: int = 5) -> Dict:
    """
    Process Groq AI response for frontend display
    
    Args:
        raw_response: Raw response from Groq AI
        commodity: Optional commodity context
        max_bullets: Maximum bullet points to return
        
    Returns:
        Formatted response ready for frontend
    """
    processor = ResponseProcessor()
    
    # Process the response
    processed = processor.process_response(raw_response, max_bullets)
    
    # Format for frontend consumption
    formatted_response = {
        "summary": processed["summary"],
        "bullet_points": [
            f"• {point}" for point in processed["key_points"]
        ],
        "sentiment": {
            "label": processed["sentiment"]["sentiment"],
            "confidence": processed["sentiment"]["confidence"],
            "color": _get_sentiment_color(processed["sentiment"]["sentiment"])
        },
        "drivers": {
            "bullish": processed["drivers"]["positive"],
            "bearish": processed["drivers"]["negative"],
            "neutral": processed["drivers"]["neutral"]
        },
        "key_stats": processed["statistics"],
        "metadata": {
            "commodity": commodity,
            "word_count": processed["word_count"],
            "reduction_rate": processed["reduction_rate"],
            "processing": "NLTK-enhanced"
        }
    }
    
    return formatted_response

def _get_sentiment_color(sentiment: str) -> str:
    """Get color for sentiment display"""
    colors = {
        'BULLISH': '#4ECCA3',
        'BEARISH': '#F05454',
        'NEUTRAL': '#EAB308'
    }
    return colors.get(sentiment, '#A0A0A0')
