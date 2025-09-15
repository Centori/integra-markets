"""
Machine Learning-based Keyword Processing System with Deep Q-Learning
Builds a self-improving keyword catalogue based on article analysis and market outcomes.
"""
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import numpy as np
from collections import deque, namedtuple, defaultdict
import random
import json
import os
import pickle
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any, Set
import logging
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import hashlib

logger = logging.getLogger(__name__)

# Experience structure for keyword learning
KeywordExperience = namedtuple('KeywordExperience', 
    ['state', 'keywords', 'reward', 'next_state', 'market_outcome'])

class KeywordDQN(nn.Module):
    """
    Deep Q-Network for keyword importance scoring and selection.
    
    Learns which keywords are most predictive of market movements
    and sentiment outcomes.
    """
    
    def __init__(self, vocab_size: int = 5000, embedding_dim: int = 128,
                 hidden_sizes: List[int] = [256, 128, 64]):
        super(KeywordDQN, self).__init__()
        
        # Embedding layer for keywords
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        
        # Context encoder
        self.context_encoder = nn.LSTM(
            input_size=embedding_dim,
            hidden_size=hidden_sizes[0] // 2,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.2
        )
        
        # Importance scoring network
        layers = []
        input_size = hidden_sizes[0]
        
        for hidden_size in hidden_sizes[1:]:
            layers.extend([
                nn.Linear(input_size, hidden_size),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_size),
                nn.Dropout(0.3)
            ])
            input_size = hidden_size
        
        # Output layer - score for each word in vocabulary
        layers.append(nn.Linear(input_size, vocab_size))
        
        self.importance_network = nn.Sequential(*layers)
        
    def forward(self, keyword_indices: torch.Tensor, context_mask: Optional[torch.Tensor] = None):
        """
        Forward pass to score keyword importance.
        
        Args:
            keyword_indices: Tensor of keyword indices [batch_size, seq_len]
            context_mask: Optional mask for padding [batch_size, seq_len]
        """
        # Embed keywords
        embedded = self.embedding(keyword_indices)
        
        # Encode context
        lstm_out, (hidden, cell) = self.context_encoder(embedded)
        
        # Use final hidden state for importance scoring
        context_repr = torch.cat([hidden[-2], hidden[-1]], dim=1)
        
        # Score importance of each keyword
        importance_scores = self.importance_network(context_repr)
        
        return importance_scores

class KeywordCatalogue:
    """
    Self-learning keyword catalogue that maintains and updates
    keyword patterns, relationships, and importance scores.
    """
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'keyword_catalogue')
        
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        # Core data structures
        self.keyword_index = {}  # word -> index mapping
        self.index_keyword = {}  # index -> word mapping
        self.keyword_stats = defaultdict(lambda: {
            'frequency': 0,
            'impact_scores': [],
            'sentiment_associations': defaultdict(int),
            'co_occurrences': defaultdict(int),
            'market_correlations': [],
            'cluster_id': None,
            'importance_score': 0.5,
            'last_updated': None
        })
        
        # Keyword relationships
        self.keyword_clusters = {}  # cluster_id -> [keywords]
        self.keyword_graph = defaultdict(set)  # keyword -> related keywords
        self.event_patterns = defaultdict(list)  # event_type -> [keyword_patterns]
        
        # Market impact tracking
        self.market_impact_history = deque(maxlen=10000)
        
        # Load existing catalogue
        self.load_catalogue()
        
    def add_keyword(self, keyword: str) -> int:
        """Add a new keyword to the catalogue and return its index."""
        keyword = keyword.lower().strip()
        
        if keyword not in self.keyword_index:
            idx = len(self.keyword_index)
            self.keyword_index[keyword] = idx
            self.index_keyword[idx] = keyword
            self.keyword_stats[keyword]['last_updated'] = datetime.now().isoformat()
        
        return self.keyword_index[keyword]
    
    def update_keyword_stats(self, keyword: str, context: Dict[str, Any]):
        """
        Update statistics for a keyword based on its context and outcome.
        
        Args:
            keyword: The keyword to update
            context: Dictionary containing:
                - sentiment: The sentiment context
                - co_occurring: List of co-occurring keywords
                - market_impact: The market impact (bullish/bearish/neutral)
                - price_change: Actual price change percentage
                - confidence: Confidence score
        """
        keyword = keyword.lower().strip()
        self.add_keyword(keyword)
        
        stats = self.keyword_stats[keyword]
        
        # Update frequency
        stats['frequency'] += 1
        
        # Update sentiment associations
        sentiment = context.get('sentiment', 'neutral')
        stats['sentiment_associations'][sentiment] += 1
        
        # Update co-occurrences
        for co_word in context.get('co_occurring', []):
            if co_word != keyword:
                stats['co_occurrences'][co_word.lower()] += 1
                # Build bidirectional graph
                self.keyword_graph[keyword].add(co_word.lower())
                self.keyword_graph[co_word.lower()].add(keyword)
        
        # Track market impact
        price_change = context.get('price_change', 0)
        if price_change != 0:
            stats['market_correlations'].append(price_change)
            # Keep only recent correlations
            stats['market_correlations'] = stats['market_correlations'][-100:]
        
        # Calculate impact score
        impact_score = abs(price_change) * context.get('confidence', 0.5)
        stats['impact_scores'].append(impact_score)
        stats['impact_scores'] = stats['impact_scores'][-100:]
        
        # Update importance score (moving average)
        if stats['impact_scores']:
            stats['importance_score'] = np.mean(stats['impact_scores'])
        
        stats['last_updated'] = datetime.now().isoformat()
    
    def cluster_keywords(self, min_frequency: int = 5):
        """
        Cluster keywords based on their usage patterns and relationships.
        Uses K-means clustering on TF-IDF vectors of co-occurrence patterns.
        """
        # Filter keywords by frequency
        active_keywords = [kw for kw, stats in self.keyword_stats.items() 
                          if stats['frequency'] >= min_frequency]
        
        if len(active_keywords) < 10:
            return  # Not enough data for clustering
        
        # Create co-occurrence matrix
        co_occurrence_texts = []
        for keyword in active_keywords:
            # Build "document" from co-occurring words
            co_words = self.keyword_stats[keyword]['co_occurrences']
            text = ' '.join([word for word, count in co_words.items() 
                           for _ in range(min(count, 5))])  # Cap repetitions
            co_occurrence_texts.append(text)
        
        # TF-IDF vectorization
        try:
            vectorizer = TfidfVectorizer(max_features=100, min_df=2)
            X = vectorizer.fit_transform(co_occurrence_texts)
            
            # Determine optimal number of clusters (between 5 and 20)
            n_clusters = min(max(5, len(active_keywords) // 10), 20)
            
            # K-means clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(X)
            
            # Update cluster assignments
            self.keyword_clusters = defaultdict(list)
            for keyword, cluster_id in zip(active_keywords, cluster_labels):
                self.keyword_stats[keyword]['cluster_id'] = int(cluster_id)
                self.keyword_clusters[int(cluster_id)].append(keyword)
            
            logger.info(f"Clustered {len(active_keywords)} keywords into {n_clusters} clusters")
            
        except Exception as e:
            logger.error(f"Clustering failed: {e}")
    
    def identify_event_patterns(self):
        """
        Identify recurring keyword patterns associated with specific event types.
        """
        # Group keywords by their dominant sentiment and impact
        for keyword, stats in self.keyword_stats.items():
            if stats['frequency'] < 3:
                continue
            
            # Determine dominant sentiment
            sentiment_counts = stats['sentiment_associations']
            if sentiment_counts:
                dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)
                
                # Calculate average market impact
                if stats['market_correlations']:
                    avg_impact = np.mean(stats['market_correlations'])
                    
                    # Classify event type based on impact and sentiment
                    if abs(avg_impact) > 2.0:
                        if dominant_sentiment == 'bearish' and avg_impact < 0:
                            event_type = 'major_negative_event'
                        elif dominant_sentiment == 'bullish' and avg_impact > 0:
                            event_type = 'major_positive_event'
                        else:
                            event_type = 'high_volatility_event'
                    elif abs(avg_impact) > 0.5:
                        event_type = f'moderate_{dominant_sentiment}_event'
                    else:
                        event_type = 'low_impact_event'
                    
                    # Store pattern
                    pattern = {
                        'keyword': keyword,
                        'avg_impact': avg_impact,
                        'frequency': stats['frequency'],
                        'co_occurring': list(stats['co_occurrences'].keys())[:5],
                        'confidence': stats['importance_score']
                    }
                    
                    self.event_patterns[event_type].append(pattern)
    
    def get_related_keywords(self, keyword: str, max_depth: int = 2) -> Set[str]:
        """
        Get related keywords using graph traversal.
        
        Args:
            keyword: Starting keyword
            max_depth: Maximum traversal depth
        """
        keyword = keyword.lower().strip()
        related = set()
        visited = set()
        queue = [(keyword, 0)]
        
        while queue:
            current, depth = queue.pop(0)
            if current in visited or depth > max_depth:
                continue
            
            visited.add(current)
            if depth > 0:  # Don't include the original keyword
                related.add(current)
            
            # Add neighbors to queue
            for neighbor in self.keyword_graph.get(current, []):
                if neighbor not in visited:
                    queue.append((neighbor, depth + 1))
        
        return related
    
    def predict_keyword_impact(self, keywords: List[str]) -> Dict[str, float]:
        """
        Predict the market impact of a set of keywords.
        
        Returns:
            Dictionary with impact predictions
        """
        impact_scores = {}
        
        for keyword in keywords:
            keyword = keyword.lower().strip()
            stats = self.keyword_stats.get(keyword)
            
            if stats and stats['market_correlations']:
                # Calculate weighted impact based on historical data
                recent_impacts = stats['market_correlations'][-20:]  # Last 20 occurrences
                if recent_impacts:
                    # Weight recent impacts more heavily
                    weights = np.exp(np.linspace(-1, 0, len(recent_impacts)))
                    weights /= weights.sum()
                    weighted_impact = np.average(recent_impacts, weights=weights)
                    
                    # Combine with importance score
                    impact_scores[keyword] = weighted_impact * stats['importance_score']
                else:
                    impact_scores[keyword] = 0.0
            else:
                # New keyword - assign neutral impact
                impact_scores[keyword] = 0.0
        
        return impact_scores
    
    def save_catalogue(self):
        """Save the keyword catalogue to disk."""
        catalogue_data = {
            'keyword_index': self.keyword_index,
            'index_keyword': self.index_keyword,
            'keyword_stats': dict(self.keyword_stats),
            'keyword_clusters': dict(self.keyword_clusters),
            'keyword_graph': dict(self.keyword_graph),
            'event_patterns': dict(self.event_patterns),
            'market_impact_history': list(self.market_impact_history),
            'last_saved': datetime.now().isoformat()
        }
        
        catalogue_path = os.path.join(self.data_dir, 'keyword_catalogue.json')
        with open(catalogue_path, 'w') as f:
            json.dump(catalogue_data, f, indent=2, default=str)
        
        logger.info(f"Saved keyword catalogue with {len(self.keyword_index)} keywords")
    
    def load_catalogue(self):
        """Load the keyword catalogue from disk."""
        catalogue_path = os.path.join(self.data_dir, 'keyword_catalogue.json')
        
        if os.path.exists(catalogue_path):
            try:
                with open(catalogue_path, 'r') as f:
                    catalogue_data = json.load(f)
                
                self.keyword_index = catalogue_data.get('keyword_index', {})
                self.index_keyword = {int(k): v for k, v in catalogue_data.get('index_keyword', {}).items()}
                
                # Restore defaultdicts
                self.keyword_stats = defaultdict(lambda: {
                    'frequency': 0,
                    'impact_scores': [],
                    'sentiment_associations': defaultdict(int),
                    'co_occurrences': defaultdict(int),
                    'market_correlations': [],
                    'cluster_id': None,
                    'importance_score': 0.5,
                    'last_updated': None
                })
                
                for kw, stats in catalogue_data.get('keyword_stats', {}).items():
                    self.keyword_stats[kw].update(stats)
                    # Convert nested dicts back to defaultdicts
                    if 'sentiment_associations' in stats:
                        self.keyword_stats[kw]['sentiment_associations'] = defaultdict(int, stats['sentiment_associations'])
                    if 'co_occurrences' in stats:
                        self.keyword_stats[kw]['co_occurrences'] = defaultdict(int, stats['co_occurrences'])
                
                self.keyword_clusters = defaultdict(list, catalogue_data.get('keyword_clusters', {}))
                self.keyword_graph = defaultdict(set)
                for kw, related in catalogue_data.get('keyword_graph', {}).items():
                    self.keyword_graph[kw] = set(related)
                
                self.event_patterns = defaultdict(list, catalogue_data.get('event_patterns', {}))
                self.market_impact_history = deque(
                    catalogue_data.get('market_impact_history', []), 
                    maxlen=10000
                )
                
                logger.info(f"Loaded keyword catalogue with {len(self.keyword_index)} keywords")
            except Exception as e:
                logger.error(f"Failed to load catalogue: {e}")

class KeywordMLProcessor:
    """
    Main ML processor for intelligent keyword extraction and learning.
    """
    
    def __init__(self, vocab_size: int = 5000, learning_rate: float = 0.001):
        self.vocab_size = vocab_size
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize DQN for keyword scoring
        self.keyword_dqn = KeywordDQN(vocab_size=vocab_size).to(self.device)
        self.target_dqn = KeywordDQN(vocab_size=vocab_size).to(self.device)
        self.optimizer = optim.Adam(self.keyword_dqn.parameters(), lr=learning_rate)
        
        # Initialize keyword catalogue
        self.catalogue = KeywordCatalogue()
        
        # Experience replay buffer
        self.memory = deque(maxlen=5000)
        
        # Training parameters
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.batch_size = 32
        self.update_target_every = 100
        self.learn_step_counter = 0
        
        # Model save path
        self.model_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'keyword_ml')
        os.makedirs(self.model_dir, exist_ok=True)
    
    def extract_intelligent_keywords(self, 
                                    text: str, 
                                    context: Dict[str, Any],
                                    max_keywords: int = 15) -> List[Dict[str, Any]]:
        """
        Extract keywords using ML-based importance scoring.
        
        Args:
            text: Input text
            context: Context including sentiment, commodity, event_type
            max_keywords: Maximum number of keywords to return
        
        Returns:
            List of keyword dictionaries with scores and metadata
        """
        # Basic preprocessing
        text_lower = text.lower()
        words = re.findall(r'\b[a-z]+\b', text_lower)
        
        # Get all potential keywords (using comprehensive list + catalogue)
        potential_keywords = self._get_potential_keywords(text, words)
        
        # Score keywords using DQN if we have enough data
        if len(self.catalogue.keyword_index) > 100:
            keyword_scores = self._score_keywords_dqn(potential_keywords, context)
        else:
            # Fallback to statistical scoring
            keyword_scores = self._score_keywords_statistical(potential_keywords, text, context)
        
        # Add related keywords from catalogue
        enhanced_keywords = self._enhance_with_related(keyword_scores, context)
        
        # Sort by score and take top N
        sorted_keywords = sorted(enhanced_keywords.items(), key=lambda x: x[1]['score'], reverse=True)
        
        # Format output
        result = []
        for keyword, info in sorted_keywords[:max_keywords]:
            # Update catalogue with this occurrence
            self.catalogue.update_keyword_stats(keyword, {
                'sentiment': context.get('sentiment', 'neutral'),
                'co_occurring': [kw for kw, _ in sorted_keywords[:10] if kw != keyword],
                'market_impact': context.get('market_impact', 'neutral'),
                'price_change': context.get('price_change', 0),
                'confidence': info['score']
            })
            
            result.append({
                'word': keyword,
                'score': round(info['score'], 3),
                'type': info.get('type', 'extracted'),
                'sentiment': info.get('sentiment', 'neutral'),
                'cluster_id': self.catalogue.keyword_stats[keyword].get('cluster_id'),
                'importance': self.catalogue.keyword_stats[keyword].get('importance_score', 0.5)
            })
        
        # Periodically update clusters and patterns
        if random.random() < 0.01:  # 1% chance
            self.catalogue.cluster_keywords()
            self.catalogue.identify_event_patterns()
            self.catalogue.save_catalogue()
        
        return result
    
    def _get_potential_keywords(self, text: str, words: List[str]) -> Set[str]:
        """Get all potential keywords from text."""
        potential = set()
        
        # Import comprehensive keyword lists
        try:
            from app.services.news_preprocessing import (
                EVENT_TYPE_KEYWORDS, MARKET_IMPACT_KEYWORDS, 
                COMMODITY_KEYWORDS, REGIONAL_KEYWORDS
            )
            
            # Add event-type keywords
            for event_type, keywords in EVENT_TYPE_KEYWORDS.items():
                for keyword in keywords:
                    if keyword.lower() in text.lower():
                        potential.add(keyword.lower())
            
            # Add market impact keywords
            for impact_type, keywords in MARKET_IMPACT_KEYWORDS.items():
                for keyword in keywords:
                    if keyword.lower() in text.lower():
                        potential.add(keyword.lower())
            
            # Add commodity-specific keywords
            for commodity, keyword_dict in COMMODITY_KEYWORDS.items():
                for keyword_list in keyword_dict.values():
                    if isinstance(keyword_list, list):
                        for keyword in keyword_list:
                            if keyword.lower() in text.lower():
                                potential.add(keyword.lower())
        except ImportError:
            pass
        
        # Add words from catalogue with high importance
        for word in words:
            if word in self.catalogue.keyword_stats:
                stats = self.catalogue.keyword_stats[word]
                if stats['importance_score'] > 0.3 or stats['frequency'] > 10:
                    potential.add(word)
        
        # Add bigrams and trigrams for important phrases
        for i in range(len(words) - 1):
            bigram = f"{words[i]} {words[i+1]}"
            if any(phrase in bigram for phrase in ['supply', 'demand', 'price', 'production']):
                potential.add(bigram)
        
        return potential
    
    def _score_keywords_dqn(self, keywords: Set[str], context: Dict[str, Any]) -> Dict[str, Dict]:
        """Score keywords using the trained DQN."""
        keyword_scores = {}
        
        # Convert keywords to indices
        keyword_list = list(keywords)
        indices = []
        for kw in keyword_list:
            if kw in self.catalogue.keyword_index:
                indices.append(self.catalogue.keyword_index[kw])
            else:
                # Add new keyword
                idx = self.catalogue.add_keyword(kw)
                indices.append(idx)
        
        if not indices:
            return keyword_scores
        
        # Pad or truncate to fixed size
        max_len = 50
        if len(indices) < max_len:
            indices = indices + [0] * (max_len - len(indices))
        else:
            indices = indices[:max_len]
        
        # Get DQN scores
        indices_tensor = torch.LongTensor([indices]).to(self.device)
        
        self.keyword_dqn.eval()
        with torch.no_grad():
            scores = self.keyword_dqn(indices_tensor).cpu().numpy()[0]
        
        # Map scores back to keywords
        for i, kw in enumerate(keyword_list):
            if i < len(indices) and indices[i] < len(scores):
                score = float(scores[indices[i]])
                # Normalize score
                score = 1 / (1 + np.exp(-score))  # Sigmoid
                
                keyword_scores[kw] = {
                    'score': score,
                    'type': 'ml_scored',
                    'sentiment': context.get('sentiment', 'neutral')
                }
        
        return keyword_scores
    
    def _score_keywords_statistical(self, keywords: Set[str], text: str, context: Dict[str, Any]) -> Dict[str, Dict]:
        """Score keywords using statistical methods (fallback)."""
        keyword_scores = {}
        text_lower = text.lower()
        
        for keyword in keywords:
            score = 0.0
            
            # Frequency in text
            count = text_lower.count(keyword.lower())
            score += min(count * 0.2, 0.6)
            
            # Historical importance from catalogue
            if keyword in self.catalogue.keyword_stats:
                stats = self.catalogue.keyword_stats[keyword]
                score += stats['importance_score'] * 0.3
                
                # Boost if frequently associated with similar sentiment
                sentiment = context.get('sentiment', 'neutral')
                if sentiment in stats['sentiment_associations']:
                    assoc_rate = stats['sentiment_associations'][sentiment] / max(stats['frequency'], 1)
                    score += assoc_rate * 0.2
            
            # Position in text (earlier is more important)
            position = text_lower.find(keyword.lower())
            if position >= 0:
                position_score = 1.0 - (position / len(text_lower))
                score += position_score * 0.1
            
            # Event-specific boosting
            event_type = context.get('event_type')
            if event_type and event_type in self.catalogue.event_patterns:
                for pattern in self.catalogue.event_patterns[event_type]:
                    if keyword == pattern['keyword']:
                        score += 0.3
                        break
            
            keyword_scores[keyword] = {
                'score': min(score, 1.0),
                'type': 'statistical',
                'sentiment': context.get('sentiment', 'neutral')
            }
        
        return keyword_scores
    
    def _enhance_with_related(self, keyword_scores: Dict[str, Dict], context: Dict[str, Any]) -> Dict[str, Dict]:
        """Enhance keyword list with related keywords from the catalogue."""
        enhanced = keyword_scores.copy()
        
        # Get top keywords
        top_keywords = sorted(keyword_scores.keys(), 
                            key=lambda k: keyword_scores[k]['score'], 
                            reverse=True)[:5]
        
        # Add related keywords
        for keyword in top_keywords:
            related = self.catalogue.get_related_keywords(keyword, max_depth=1)
            
            for related_kw in related:
                if related_kw not in enhanced and len(enhanced) < 20:
                    # Calculate score based on relationship strength
                    base_score = keyword_scores[keyword]['score']
                    
                    # Check co-occurrence strength
                    stats = self.catalogue.keyword_stats[keyword]
                    co_occurrence_count = stats['co_occurrences'].get(related_kw, 0)
                    relationship_strength = min(co_occurrence_count / 10, 1.0)
                    
                    enhanced[related_kw] = {
                        'score': base_score * 0.7 * relationship_strength,
                        'type': 'related',
                        'sentiment': context.get('sentiment', 'neutral'),
                        'related_to': keyword
                    }
        
        return enhanced
    
    def train_on_outcome(self, 
                        keywords_used: List[str],
                        predicted_impact: str,
                        actual_outcome: Dict[str, Any]):
        """
        Train the model based on actual market outcomes.
        
        Args:
            keywords_used: Keywords that were extracted
            predicted_impact: What was predicted (bullish/bearish/neutral)
            actual_outcome: What actually happened
        """
        # Calculate reward based on prediction accuracy
        actual_direction = actual_outcome.get('price_direction', 'neutral')
        price_change = actual_outcome.get('price_change', 0)
        
        reward = 0.0
        if predicted_impact == actual_direction:
            reward = 1.0 + min(abs(price_change) / 10, 1.0)  # Scale with magnitude
        elif predicted_impact == 'neutral' and abs(price_change) < 0.5:
            reward = 0.5
        else:
            reward = -0.5
        
        # Update keyword statistics based on outcome
        for keyword in keywords_used:
            self.catalogue.update_keyword_stats(keyword, {
                'sentiment': predicted_impact,
                'co_occurring': [kw for kw in keywords_used if kw != keyword],
                'market_impact': actual_direction,
                'price_change': price_change,
                'confidence': abs(reward)
            })
        
        # Store experience for DQN training
        # (Simplified for demonstration - full implementation would include proper state encoding)
        experience = {
            'keywords': keywords_used,
            'reward': reward,
            'outcome': actual_outcome
        }
        self.memory.append(experience)
        
        # Train DQN if we have enough experiences
        if len(self.memory) >= self.batch_size:
            self._train_dqn()
        
        # Save updated catalogue
        self.catalogue.save_catalogue()
    
    def _train_dqn(self):
        """Train the DQN on a batch of experiences."""
        # Simplified training loop - full implementation would include
        # proper state/action encoding and Q-learning updates
        pass
    
    def get_keyword_insights(self, keyword: str) -> Dict[str, Any]:
        """
        Get detailed insights about a specific keyword.
        
        Args:
            keyword: The keyword to analyze
            
        Returns:
            Dictionary with keyword insights
        """
        keyword = keyword.lower().strip()
        
        if keyword not in self.catalogue.keyword_stats:
            return {
                'keyword': keyword,
                'status': 'unknown',
                'message': 'Keyword not found in catalogue'
            }
        
        stats = self.catalogue.keyword_stats[keyword]
        
        # Calculate trend
        if stats['market_correlations']:
            recent_impacts = stats['market_correlations'][-10:]
            trend = 'bullish' if np.mean(recent_impacts) > 0 else 'bearish'
            volatility = np.std(recent_impacts) if len(recent_impacts) > 1 else 0
        else:
            trend = 'neutral'
            volatility = 0
        
        # Get related keywords
        related = list(self.catalogue.get_related_keywords(keyword, max_depth=1))[:5]
        
        # Determine primary sentiment association
        sentiment_assoc = stats['sentiment_associations']
        if sentiment_assoc:
            primary_sentiment = max(sentiment_assoc, key=sentiment_assoc.get)
        else:
            primary_sentiment = 'neutral'
        
        return {
            'keyword': keyword,
            'frequency': stats['frequency'],
            'importance_score': round(stats['importance_score'], 3),
            'trend': trend,
            'volatility': round(volatility, 3),
            'primary_sentiment': primary_sentiment,
            'cluster_id': stats['cluster_id'],
            'related_keywords': related,
            'top_co_occurrences': dict(sorted(
                stats['co_occurrences'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]),
            'average_impact': round(np.mean(stats['market_correlations']), 3) if stats['market_correlations'] else 0,
            'last_updated': stats['last_updated']
        }
    
    def get_event_patterns_summary(self) -> Dict[str, List[Dict]]:
        """Get a summary of identified event patterns."""
        summary = {}
        
        for event_type, patterns in self.catalogue.event_patterns.items():
            # Sort patterns by confidence and frequency
            sorted_patterns = sorted(patterns, 
                                    key=lambda p: p['confidence'] * p['frequency'], 
                                    reverse=True)[:5]
            
            summary[event_type] = sorted_patterns
        
        return summary
    
    def save_model(self):
        """Save the DQN model and training state."""
        checkpoint = {
            'model_state_dict': self.keyword_dqn.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'epsilon': self.epsilon,
            'learn_step_counter': self.learn_step_counter
        }
        
        model_path = os.path.join(self.model_dir, 'keyword_dqn_checkpoint.pth')
        torch.save(checkpoint, model_path)
        logger.info(f"Saved keyword ML model to {model_path}")
    
    def load_model(self):
        """Load the DQN model from checkpoint."""
        model_path = os.path.join(self.model_dir, 'keyword_dqn_checkpoint.pth')
        
        if os.path.exists(model_path):
            checkpoint = torch.load(model_path, map_location=self.device)
            self.keyword_dqn.load_state_dict(checkpoint['model_state_dict'])
            self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            self.epsilon = checkpoint.get('epsilon', 0.1)
            self.learn_step_counter = checkpoint.get('learn_step_counter', 0)
            
            # Update target network
            self.target_dqn.load_state_dict(self.keyword_dqn.state_dict())
            
            logger.info(f"Loaded keyword ML model from {model_path}")
            return True
        
        return False

# Global instance
keyword_processor = KeywordMLProcessor()

# Load existing model if available
keyword_processor.load_model()

def extract_ml_keywords(text: str, context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Main entry point for ML-based keyword extraction.
    
    Args:
        text: Input text to analyze
        context: Optional context dictionary with sentiment, commodity, etc.
    
    Returns:
        List of keyword dictionaries with scores and metadata
    """
    if context is None:
        context = {}
    
    return keyword_processor.extract_intelligent_keywords(text, context)

def train_on_market_outcome(keywords: List[str], predicted: str, actual: Dict[str, Any]):
    """
    Train the model based on actual market outcomes.
    
    Args:
        keywords: Keywords that were used
        predicted: Predicted market impact
        actual: Actual market outcome
    """
    keyword_processor.train_on_outcome(keywords, predicted, actual)

def get_keyword_analysis(keyword: str) -> Dict[str, Any]:
    """
    Get detailed analysis of a specific keyword.
    
    Args:
        keyword: The keyword to analyze
    
    Returns:
        Dictionary with keyword insights
    """
    return keyword_processor.get_keyword_insights(keyword)

def get_event_patterns() -> Dict[str, List[Dict]]:
    """
    Get identified event patterns from the keyword catalogue.
    
    Returns:
        Dictionary of event types and their associated patterns
    """
    return keyword_processor.get_event_patterns_summary()
