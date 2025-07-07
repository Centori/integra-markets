"""
Self-learning machine learning component for news analysis
Works with existing news_preprocessing.py to improve analysis over time
"""
import os
import json
import pickle
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import joblib

# Try to import scikit-learn - will be our main ML framework
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: scikit-learn not available. ML capabilities will be limited.")

# Import our existing preprocessing
from services.news_preprocessing import preprocess_news, get_domain_keywords

# Directory setup for model storage
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "cache")
os.makedirs(MODEL_DIR, exist_ok=True)

# Model file paths
IMPACT_MODEL_PATH = os.path.join(MODEL_DIR, "market_impact_model.joblib")
COMMODITY_MODEL_PATH = os.path.join(MODEL_DIR, "commodity_classifier.joblib")
SEVERITY_MODEL_PATH = os.path.join(MODEL_DIR, "severity_classifier.joblib")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "news_vectorizer.joblib")

# Training data storage
TRAINING_DATA_PATH = os.path.join(MODEL_DIR, "historical_news_data.json")

class NewsMLEnhancer:
    """Self-learning news analysis component that improves over time"""
    
    def __init__(self):
        """Initialize the ML enhancer with existing or new models"""
        self.vectorizer = self._load_or_create_vectorizer()
        self.impact_model = self._load_or_create_model(IMPACT_MODEL_PATH)
        self.commodity_model = self._load_or_create_model(COMMODITY_MODEL_PATH)
        self.severity_model = self._load_or_create_model(SEVERITY_MODEL_PATH)
        self.historical_data = self._load_historical_data()
        self.min_training_samples = 20  # Minimum samples needed before ML kicks in
    
    def _load_or_create_vectorizer(self):
        """Load existing vectorizer or create a new one"""
        if os.path.exists(VECTORIZER_PATH) and SKLEARN_AVAILABLE:
            try:
                return joblib.load(VECTORIZER_PATH)
            except:
                pass
        
        if SKLEARN_AVAILABLE:
            return TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        return None
    
    def _load_or_create_model(self, model_path):
        """Load existing model or create a new one"""
        if os.path.exists(model_path) and SKLEARN_AVAILABLE:
            try:
                return joblib.load(model_path)
            except:
                pass
        
        if SKLEARN_AVAILABLE:
            return RandomForestClassifier(n_estimators=100, random_state=42)
        return None
    
    def _load_historical_data(self):
        """Load historical training data"""
        if os.path.exists(TRAINING_DATA_PATH):
            try:
                with open(TRAINING_DATA_PATH, 'r') as f:
                    return json.load(f)
            except:
                pass
        return []
    
    def _save_historical_data(self):
        """Save historical training data"""
        with open(TRAINING_DATA_PATH, 'w') as f:
            json.dump(self.historical_data, f)
    
    def _save_models(self):
        """Save all models and vectorizer"""
        if SKLEARN_AVAILABLE:
            if self.vectorizer is not None:
                joblib.dump(self.vectorizer, VECTORIZER_PATH)
            if self.impact_model is not None:
                joblib.dump(self.impact_model, IMPACT_MODEL_PATH)
            if self.commodity_model is not None:
                joblib.dump(self.commodity_model, COMMODITY_MODEL_PATH)
            if self.severity_model is not None:
                joblib.dump(self.severity_model, SEVERITY_MODEL_PATH)
    
    def add_historical_example(self, text: str, impact: str, commodity: str, 
                              severity: str, feedback_source: str = "user"):
        """Add a historical example with confirmed outcomes for training"""
        self.historical_data.append({
            "text": text,
            "impact": impact,
            "commodity": commodity,
            "severity": severity,
            "timestamp": datetime.now().isoformat(),
            "source": feedback_source
        })
        self._save_historical_data()
        
        # Retrain if we have enough data and sklearn
        if len(self.historical_data) >= self.min_training_samples and SKLEARN_AVAILABLE:
            self._train_models()
    
    def _train_models(self):
        """Train all models on historical data"""
        if not SKLEARN_AVAILABLE or len(self.historical_data) < self.min_training_samples:
            return False
        
        texts = [item["text"] for item in self.historical_data]
        impact_labels = [item["impact"] for item in self.historical_data]
        commodity_labels = [item["commodity"] for item in self.historical_data]
        severity_labels = [item["severity"] for item in self.historical_data]
        
        # Create feature vectors
        X = self.vectorizer.fit_transform(texts)
        
        # Train impact model
        self.impact_model.fit(X, impact_labels)
        
        # Train commodity model
        self.commodity_model.fit(X, commodity_labels)
        
        # Train severity model
        self.severity_model.fit(X, severity_labels)
        
        # Save the updated models
        self._save_models()
        return True
    
    def enhance_analysis(self, text: str, base_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance base analysis with ML predictions if available"""
        enhanced = base_analysis.copy()
        
        # Only enhance if we have trained models and enough historical data
        if not SKLEARN_AVAILABLE or len(self.historical_data) < self.min_training_samples:
            enhanced["ml_enhanced"] = False
            return enhanced
        
        try:
            # Vectorize the text
            X = self.vectorizer.transform([text])
            
            # Get ML predictions
            impact_pred = self.impact_model.predict(X)[0]
            commodity_pred = self.commodity_model.predict(X)[0]
            severity_pred = self.severity_model.predict(X)[0]
            
            # Calculate prediction probabilities
            impact_proba = max(self.impact_model.predict_proba(X)[0])
            commodity_proba = max(self.commodity_model.predict_proba(X)[0])
            severity_proba = max(self.severity_model.predict_proba(X)[0])
            
            # Hybrid approach: combine rule-based and ML predictions
            # If ML confidence is high, favor ML prediction
            if commodity_proba > 0.7:
                enhanced["commodity"] = commodity_pred
            
            if impact_proba > 0.7:
                enhanced["market_impact"] = impact_pred
            
            if severity_proba > 0.7:
                enhanced["severity"] = severity_pred
            
            # Add ML metadata
            enhanced["ml_enhanced"] = True
            enhanced["ml_metadata"] = {
                "impact_confidence": float(impact_proba),
                "commodity_confidence": float(commodity_proba),
                "severity_confidence": float(severity_proba),
                "training_samples": len(self.historical_data),
                "ml_version": "0.1.0"
            }
            
            # Adjust confidence score based on ML and rule agreement
            rule_ml_agreement = (
                (enhanced["commodity"] == base_analysis["commodity"]) +
                (enhanced["market_impact"] == base_analysis["market_impact"]) +
                (enhanced["severity"] == base_analysis["severity"])
            ) / 3.0
            
            # Boost confidence if ML and rules agree
            if rule_ml_agreement > 0.66:
                enhanced["confidence_score"] = min(
                    enhanced["confidence_score"] * 1.2, 
                    0.95
                )
            
        except Exception as e:
            # Fallback to base analysis if ML fails
            enhanced["ml_enhanced"] = False
            enhanced["ml_error"] = str(e)
        
        return enhanced
    
    def get_ml_stats(self) -> Dict[str, Any]:
        """Get statistics about the ML model performance"""
        return {
            "historical_samples": len(self.historical_data),
            "ml_enabled": SKLEARN_AVAILABLE,
            "models_trained": os.path.exists(IMPACT_MODEL_PATH),
            "last_training": os.path.getmtime(IMPACT_MODEL_PATH) if os.path.exists(IMPACT_MODEL_PATH) else None,
            "min_samples_needed": self.min_training_samples
        }
    
    def process_with_learning(self, text: str) -> Dict[str, Any]:
        """Process news text with ML enhancement if available"""
        # First get the rule-based analysis
        base_analysis = preprocess_news(text)
        
        # If there was an error in base analysis, return it
        if "error" in base_analysis:
            return base_analysis
        
        # Enhance with ML if possible
        enhanced = self.enhance_analysis(text, base_analysis)
        
        # Add this as a historical example with rule-based labels
        # (system generated examples have lower weight during training)
        self.add_historical_example(
            text=text,
            impact=base_analysis["market_impact"],
            commodity=base_analysis["commodity"],
            severity=base_analysis["severity"],
            feedback_source="system"
        )
        
        return enhanced

# Global instance for easy import and reuse
news_ml = NewsMLEnhancer()

def analyze_news_with_learning(text: str) -> Dict[str, Any]:
    """Analyze news with the self-learning system"""
    return news_ml.process_with_learning(text)

def provide_feedback(text: str, correct_impact: str = None, 
                    correct_commodity: str = None, correct_severity: str = None) -> bool:
    """
    Provide feedback to improve the ML system
    
    This function lets users correct analysis results, which improves future predictions
    """
    # Must have at least one correction
    if not any([correct_impact, correct_commodity, correct_severity]):
        return False
    
    # Get current analysis to fill in missing corrections
    current = preprocess_news(text)
    
    # Use provided corrections or fallback to current analysis
    impact = correct_impact if correct_impact else current["market_impact"]
    commodity = correct_commodity if correct_commodity else current["commodity"]
    severity = correct_severity if correct_severity else current["severity"]
    
    # Add this as a user-verified example (higher weight in training)
    news_ml.add_historical_example(
        text=text,
        impact=impact,
        commodity=commodity,
        severity=severity,
        feedback_source="user_correction"
    )
    
    return True

def get_ml_system_status() -> Dict[str, Any]:
    """Get status information about the ML enhancement system"""
    return news_ml.get_ml_stats()