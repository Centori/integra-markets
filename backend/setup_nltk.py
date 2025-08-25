#!/usr/bin/env python3
"""
Setup NLTK data for Integra Markets
"""
import nltk
import os
import sys

def download_nltk_data():
    """Download required NLTK data packages"""
    print("📚 Setting up NLTK data...")
    
    # List of required NLTK data packages
    packages = [
        'vader_lexicon',  # For VADER sentiment analysis
        'punkt',          # For tokenization
        'stopwords',      # For text preprocessing
        'averaged_perceptron_tagger',  # For POS tagging
        'wordnet',        # For lemmatization
    ]
    
    # Download each package
    for package in packages:
        try:
            nltk.data.find(f'tokenizers/{package}')
            print(f"✓ {package} already downloaded")
        except LookupError:
            print(f"⬇️  Downloading {package}...")
            nltk.download(package, quiet=True)
            print(f"✓ {package} downloaded successfully")
    
    print("\n✅ NLTK setup complete!")
    
    # Verify VADER is working
    try:
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
        sia = SentimentIntensityAnalyzer()
        test_result = sia.polarity_scores("This is great!")
        print(f"\n🧪 VADER test successful: {test_result}")
    except Exception as e:
        print(f"\n❌ VADER test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    download_nltk_data()
