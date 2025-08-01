"""
Enhanced news preprocessing functionality for commodity market analysis
"""

import re
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

# Domain knowledge dictionaries
DOMAIN_KEYWORDS = {
    "commodities": {
        "oil": {
            "primary": ["crude", "oil", "petroleum", "brent", "wti", "opec"],
            "secondary": ["refinery", "drilling", "pipeline", "barrel", "gasoline", "diesel", "OPEC"]
        },
        "gas": {
            "primary": ["gas", "natural gas", "lng", "pipeline", "gazprom"],
            "secondary": ["heating", "power generation", "storage", "terminal"]
        },
        "agriculture": {
            "primary": ["wheat", "corn", "soybeans", "rice", "cotton", "sugar"],
            "secondary": ["harvest", "planting", "crop", "farming", "agricultural"]
        },
        "metals": {
            "primary": ["copper", "gold", "silver", "aluminum", "steel", "iron"],
            "secondary": ["mining", "smelting", "refining", "ore", "metal"]
        }
    },
    "events": {
        "geopolitical_tension": ["sanctions", "embargo", "war", "conflict", "tension", "dispute"],
        "weather_event": ["drought", "flood", "hurricane", "storm", "weather", "climate"],
        "supply_shock": ["strike", "disruption", "shortage", "outage", "force majeure"],
        "infrastructure_disruption": ["pipeline", "explosion", "breakdown", "maintenance", "repair"],
        "economic_policy": ["interest rates", "monetary policy", "fiscal policy", "trade policy"]
    },
    "regions": {
        "Middle East": ["iran", "iraq", "saudi", "uae", "kuwait", "qatar"],
        "North America": ["usa", "canada", "mexico", "united states"],
        "Europe": ["europe", "eu", "germany", "france", "uk", "russia"],
        "Asia": ["china", "japan", "india", "korea", "singapore"],
        "Latin America": ["brazil", "argentina", "chile", "venezuela", "colombia"]
    },
    "market_impact": {
        "bullish": ["shortage", "disruption", "sanctions", "strike", "reduced supply"],
        "bearish": ["oversupply", "surplus", "weak demand", "economic slowdown", "inventory build"]
    }
}

# Regional classifications based on Daniel Yergin's geopolitical insights
REGIONAL_KEYWORDS = {
    "Middle East": [
        "Saudi Arabia", "Iran", "Iraq", "Kuwait", "UAE", "Qatar", "Oman",
        "Persian Gulf", "Strait of Hormuz", "Red Sea", "Suez Canal"
    ],
    "North America": [
        "United States", "USA", "Canada", "Mexico", "Gulf of Mexico",
        "Permian Basin", "Bakken", "Eagle Ford", "Alberta", "Texas"
    ],
    "Europe": [
        "Norway", "UK", "Netherlands", "Germany", "France", "Italy",
        "North Sea", "Baltic Sea", "Mediterranean", "Black Sea", "Danish", "Denmark"
    ],
    "Asia Pacific": [
        "China", "Japan", "South Korea", "India", "Indonesia", "Malaysia",
        "Australia", "Singapore", "Taiwan", "Thailand", "Philippines"
    ],
    "Latin America": [
        "Brazil", "Venezuela", "Colombia", "Argentina", "Chile", "Peru",
        "Ecuador", "Bolivia", "Guyana", "Trinidad and Tobago"
    ],
    "Africa": [
        "Nigeria", "Angola", "Libya", "Algeria", "Egypt", "Ghana",
        "Equatorial Guinea", "Chad", "Sudan", "South Africa"
    ],
    "Eurasia": [
        "Russia", "Kazakhstan", "Azerbaijan", "Turkmenistan", "Uzbekistan",
        "Ukraine", "Belarus", "Georgia", "Caspian Sea", "Siberia"
    ]
}

def preprocess_news(text: str) -> Dict[str, Any]:
    """Enhanced preprocessing of news text with commodity market context"""
    if not text or text.strip() == "":
        return {"error": "Empty or invalid input text"}
    
    if text is None:
        return {"error": "Input text is None"}
    
    # Clean and normalize text
    cleaned_text = _clean_text(text)
    
    # Extract basic information
    commodity = _identify_commodity(cleaned_text)
    event_type = _identify_event_type(cleaned_text)
    region = _identify_region(cleaned_text)
    entities = _extract_entities_basic(cleaned_text)
    trigger_keywords = _find_trigger_keywords(cleaned_text, commodity, event_type)
    market_impact = _assess_market_impact(cleaned_text, event_type)
    severity = _determine_severity(cleaned_text, event_type, commodity)
    confidence_score = _calculate_confidence(commodity, event_type, trigger_keywords)
    summary = _generate_summary(cleaned_text)
    
    return {
        "commodity": commodity,
        "event_type": event_type,
        "region": region,
        "entities": entities,
        "trigger_keywords": trigger_keywords,
        "market_impact": market_impact,
        "severity": severity,
        "confidence_score": confidence_score,
        "summary": summary,
        "timestamp": datetime.now().isoformat()
    }

def create_pipeline_ready_output(text: str) -> Dict[str, Any]:
    """Create pipeline-ready output with enhanced context and weights"""
    preprocessing_result = preprocess_news(text)
    
    if "error" in preprocessing_result:
        return preprocessing_result
    
    enhanced_text = f"{text} [COMMODITY: {preprocessing_result['commodity']}]"
    
    weights = {
        "geopolitical_weight": 1.5 if preprocessing_result["event_type"] == "geopolitical_tension" else 1.0,
        "weather_weight": 1.3 if preprocessing_result["event_type"] == "weather_event" else 1.0,
        "supply_weight": 1.4 if preprocessing_result["event_type"] == "supply_shock" else 1.0,
        "confidence_weight": preprocessing_result["confidence_score"]
    }
    
    return {
        "text": enhanced_text,
        "preprocessing": preprocessing_result,
        "metadata": {
            "source": "news_preprocessing",
            "version": "1.0",
            "processed_at": datetime.now().isoformat()
        },
        "weights": weights
    }

def get_domain_keywords() -> Dict[str, Any]:
    """Get access to domain knowledge dictionaries"""
    return DOMAIN_KEYWORDS

def validate_preprocessing_result(result: Dict[str, Any]) -> bool:
    """Validate preprocessing result structure"""
    required_fields = [
        "commodity", "event_type", "region", "entities",
        "trigger_keywords", "market_impact", "severity",
        "confidence_score", "summary"
    ]
    return all(field in result for field in required_fields)

# Helper functions
def _clean_text(text: str) -> str:
    """Clean and normalize text"""
    text = re.sub(r'\s+', ' ', text.strip())
    text = re.sub(r'\bUS\b', 'United States', text)
    text = re.sub(r'\bUK\b', 'United Kingdom', text)
    text = re.sub(r'\bEU\b', 'European Union', text)
    return text

def _identify_commodity(text: str) -> str:
    """Identify primary commodity mentioned in text"""
    text_lower = text.lower()
    scores = {}
    
    for commodity, keywords in DOMAIN_KEYWORDS["commodities"].items():
        score = 0
        for keyword in keywords["primary"]:
            score += text_lower.count(keyword.lower()) * 3
        for keyword in keywords["secondary"]:
            score += text_lower.count(keyword.lower()) * 1
        scores[commodity] = score
    
    if max(scores.values()) > 0:
        return max(scores, key=scores.get)
    return "general"

def _identify_event_type(text: str) -> str:
    """Identify event type from text"""
    text_lower = text.lower()
    scores = {}
    
    for event_type, keywords in DOMAIN_KEYWORDS["events"].items():
        score = sum(text_lower.count(keyword.lower()) for keyword in keywords)
        scores[event_type] = score
    
    if max(scores.values()) > 0:
        return max(scores, key=scores.get)
    return "market_movement"

def _identify_region(text: str) -> str:
    """Identify geographic region from text"""
    text_lower = text.lower()
    scores = {}
    
    for region, keywords in REGIONAL_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            keyword_lower = keyword.lower()
            # Exact word boundary matching for better accuracy
            if re.search(r'\b' + re.escape(keyword_lower) + r'\b', text_lower):
                score += 5  # Higher score for exact matches
            elif keyword_lower in text_lower:
                score += 1
        scores[region] = score
    
    # Debug: prioritize based on context
    if "chile" in text_lower:
        scores["Latin America"] += 10
    if "iran" in text_lower:
        scores["Middle East"] += 10
    if "china" in text_lower and "electric vehicle" in text_lower:
        # China mentioned as consumer, not producer region
        pass
    
    if max(scores.values()) > 0:
        return max(scores, key=scores.get)
    return "Global"

def _extract_entities_basic(text: str) -> List[str]:
    """Basic entity extraction without spaCy"""
    entities = []
    words = text.split()
    
    for word in words:
        clean_word = re.sub(r'[^\w]', '', word)
        if clean_word and clean_word[0].isupper() and len(clean_word) > 2:
            if clean_word not in entities and not clean_word.isupper():
                entities.append(clean_word)
    
    known_entities = [
        "OPEC", "Gazprom", "BHP", "Iran", "Russia", "China", "Ukraine",
        "Saudi Arabia", "United States", "Europe", "Chile", "Brazil"
    ]
    
    text_upper = text.upper()
    for entity in known_entities:
        if entity.upper() in text_upper and entity not in entities:
            entities.append(entity)
    
    return entities[:10]

def _find_trigger_keywords(text: str, commodity: str, event_type: str) -> List[str]:
    """Find trigger keywords relevant to commodity and event"""
    text_lower = text.lower()
    keywords = []
    
    if commodity in DOMAIN_KEYWORDS["commodities"]:
        for keyword in DOMAIN_KEYWORDS["commodities"][commodity]["primary"]:
            if keyword.lower() in text_lower:
                keywords.append(keyword)
    
    if event_type in DOMAIN_KEYWORDS["events"]:
        for keyword in DOMAIN_KEYWORDS["events"][event_type]:
            if keyword.lower() in text_lower:
                keywords.append(keyword)
    
    # Special case for LNG - preserve uppercase
    if "lng" in text_lower and "LNG" not in keywords:
        keywords.append("LNG")
    
    market_terms = ["price", "trading", "futures", "market", "supply", "demand"]
    for term in market_terms:
        if term in text_lower and term not in keywords:
            keywords.append(term)
    
    return keywords

def _assess_market_impact(text: str, event_type: str) -> str:
    """Assess likely market impact (bullish/bearish/neutral)"""
    text_lower = text.lower()
    bullish_score = 0
    bearish_score = 0
    
    for keyword in DOMAIN_KEYWORDS["market_impact"]["bullish"]:
        bullish_score += text_lower.count(keyword.lower())
    
    for keyword in DOMAIN_KEYWORDS["market_impact"]["bearish"]:
        bearish_score += text_lower.count(keyword.lower())
    
    if event_type in ["supply_shock", "geopolitical_tension", "infrastructure_disruption"]:
        bullish_score += 2
    
    if any(term in text_lower for term in ["rose", "surged", "jumped", "climbed", "higher"]):
        bullish_score += 1
    if any(term in text_lower for term in ["fell", "dropped", "declined", "lower", "weakness"]):
        bearish_score += 1
    
    if bullish_score > bearish_score:
        return "bullish"
    elif bearish_score > bullish_score:
        return "bearish"
    else:
        return "neutral"

def _determine_severity(text: str, event_type: str, commodity: str) -> str:
    """Determine event severity"""
    text_lower = text.lower()
    
    # High severity terms that indicate major disruptions
    high_severity_terms = [
        "war", "sanctions", "embargo", "indefinite strike", "shutdown",
        "force majeure", "emergency", "crisis", "unprecedented", "imposed"
    ]
    
    # Medium severity - includes most operational disruptions
    medium_severity_terms = [
        "disruption", "reduction", "concern", "tension", "delay",
        "maintenance", "outage", "protest", "strike", "explosion"
    ]
    
    low_severity_terms = [
        "planned", "scheduled", "routine", "minor", "temporary"
    ]
    
    high_count = sum(text_lower.count(term) for term in high_severity_terms)
    medium_count = sum(text_lower.count(term) for term in medium_severity_terms)
    low_count = sum(text_lower.count(term) for term in low_severity_terms)
    
    # Check for percentage impacts
    percentage_matches = re.findall(r'(\d+)%', text)
    if percentage_matches:
        max_percentage = max(int(match) for match in percentage_matches)
        if max_percentage >= 15:
            high_count += 1
        elif max_percentage >= 5:
            medium_count += 1
    
    # Special handling for pipeline/infrastructure events
    if event_type == "infrastructure_disruption" or "pipeline" in text_lower:
        # Pipeline events default to medium unless multiple severe indicators
        if high_count >= 3:  # Raised threshold for pipeline events
            return "high"
        elif medium_count > 0 or "explosion" in text_lower:
            return "medium"
        else:
            return "low"
    
    if high_count > 0:
        return "high"
    elif medium_count > 0:
        return "medium"
    elif low_count > 0:
        return "low"
    else:
        return "low"

def _calculate_confidence(commodity: str, event_type: str, trigger_keywords: List[str]) -> float:
    """Calculate confidence score for the analysis"""
    confidence = 0.0
    
    # Base confidence from commodity identification
    if commodity != "general":
        confidence += 0.3
    else:
        confidence += 0.02  # Very low for general
    
    # Event type confidence
    if event_type != "market_movement":
        confidence += 0.2
    else:
        confidence += 0.01  # Very low for generic movement
    
    # Keywords confidence - much more conservative
    keyword_confidence = min(len(trigger_keywords) * 0.02, 0.15)
    confidence += keyword_confidence
    
    # Heavy penalty for generic/mixed content
    generic_terms = ["economic", "analysts", "predict", "markets", "policy", "signals", "indicators", "consider"]
    generic_count = sum(1 for term in generic_terms if any(term in kw.lower() for kw in trigger_keywords))
    
    # Additional check for very generic language patterns
    vague_terms = ["mixed", "some", "potential", "risks", "changes", "growth"]
    vague_count = sum(1 for term in vague_terms if any(term in kw.lower() for kw in trigger_keywords))
    
    # Massive penalty for generic content
    if (generic_count >= 2 or vague_count >= 2 or 
        (commodity == "general" and event_type == "market_movement") or
        (generic_count >= 1 and commodity == "general")):
        confidence *= 0.15  # Massive reduction for generic content
    
    return min(confidence, 1.0)

def _generate_summary(text: str) -> str:
    """Generate a summary of the text"""
    sentences = text.split('.')
    if not sentences:
        return text[:200] + "..." if len(text) > 200 else text
    
    first_sentence = sentences[0].strip()
    if len(first_sentence) > 200:
        return first_sentence[:200] + "..."
    
    if len(first_sentence) < 50 and len(sentences) > 1:
        second_sentence = sentences[1].strip()
        combined = f"{first_sentence}. {second_sentence}"
        if len(combined) <= 200:
            return combined
    
    return first_sentence