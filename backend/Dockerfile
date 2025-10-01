FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -c "import nltk; import ssl; ssl._create_default_https_context = ssl._create_unverified_context; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('vader_lexicon')"

# Copy the rest of the application
COPY . .

# Set default port
ENV PORT=8000

# Command to run the application
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
