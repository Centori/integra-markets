FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port that Railway will use
EXPOSE $PORT

# Command to run the application
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
