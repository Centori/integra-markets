FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data during build
RUN python -c "import nltk; nltk.download('vader_lexicon', download_dir='/root/nltk_data')"

# Copy the backend application
COPY backend/ .

# Create directories for model caching
RUN mkdir -p /app/models/finbert /app/models/nltk_data /app/cache

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FINBERT_CACHE_DIR=/app/models/finbert
ENV NLTK_DATA_PATH=/app/models/nltk_data
ENV HF_HOME=/app/cache
ENV TRANSFORMERS_CACHE=/app/cache
ENV NLTK_DATA=/root/nltk_data
ENV PORT=8000

# Expose the port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
