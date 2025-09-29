FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements-light.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set default port for Cloud Run
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Command to run the application
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
