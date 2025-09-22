# Multi-stage build for smaller final image
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    curl \
    libblas-dev \
    liblapack-dev \
    gfortran \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file from backend directory
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Download NLTK data during build (punkt and stopwords for text processing)
RUN python -c "import nltk; nltk.download('punkt', download_dir='/root/nltk_data'); nltk.download('stopwords', download_dir='/root/nltk_data'); nltk.download('vader_lexicon', download_dir='/root/nltk_data')"

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    curl \
    libblas3 \
    liblapack3 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy NLTK data from builder
COPY --from=builder /root/nltk_data /root/nltk_data

# Make sure scripts in .local are available
ENV PATH=/root/.local/bin:$PATH
ENV NLTK_DATA=/root/nltk_data

# Copy backend directory structure
COPY backend /app/backend/

# Create directories for model caching
RUN mkdir -p /app/models/finbert /app/models/nltk_data /app/cache

# Set working directory to app root
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FINBERT_CACHE_DIR=/app/models/finbert
ENV NLTK_DATA_PATH=/app/models/nltk_data
ENV HF_HOME=/app/cache
ENV TRANSFORMERS_CACHE=/app/cache
ENV PYTHONPATH="/app:/app/backend:${PYTHONPATH}"
ENV PORT=8000

# Expose the port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with explicit host and port binding
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
