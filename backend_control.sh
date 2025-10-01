#!/bin/bash

# Integra Markets Backend Control Script
# Easy switching between mock data and real-time data

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/lm/Desktop/integra/integra-markets"
VENV_DIR="$PROJECT_DIR/venv"
BACKEND_DIR="$PROJECT_DIR/backend"
PID_FILE="$PROJECT_DIR/backend.pid"

function show_menu() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}    Integra Markets Backend Control${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1) Start Real-Time Backend (Live Data)"
    echo "2) Stop Backend (Switch to Mock Data)"
    echo "3) Check Backend Status"
    echo "4) View Backend Logs"
    echo "5) Test API Endpoints"
    echo "6) Exit"
    echo ""
    echo -n "Select option: "
}

function start_backend() {
    echo -e "${YELLOW}Starting Real-Time Backend...${NC}"
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${RED}Backend already running with PID $PID${NC}"
            return 1
        else
            rm "$PID_FILE"
        fi
    fi
    
    # Activate virtual environment and start backend
    cd "$PROJECT_DIR"
    source "$VENV_DIR/bin/activate"
    
    # Start the integrated backend in background
    nohup python "$BACKEND_DIR/main_integrated.py" > "$PROJECT_DIR/backend.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    sleep 2
    
    # Check if started successfully
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}✓ Backend started successfully (PID: $PID)${NC}"
        echo -e "${GREEN}✓ Real-time data is now active${NC}"
        echo ""
        echo "Backend URL: http://192.168.0.208:8000"
        echo "View logs: tail -f $PROJECT_DIR/backend.log"
    else
        echo -e "${RED}✗ Failed to start backend${NC}"
        rm "$PID_FILE"
        return 1
    fi
}

function stop_backend() {
    echo -e "${YELLOW}Stopping Backend...${NC}"
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            rm "$PID_FILE"
            echo -e "${GREEN}✓ Backend stopped${NC}"
            echo -e "${YELLOW}→ App will now use mock data${NC}"
        else
            echo -e "${YELLOW}Backend not running${NC}"
            rm "$PID_FILE"
        fi
    else
        # Try to find and kill any running backend process
        PIDS=$(ps aux | grep "main_integrated.py" | grep -v grep | awk '{print $2}')
        if [ ! -z "$PIDS" ]; then
            echo "$PIDS" | xargs kill 2>/dev/null
            echo -e "${GREEN}✓ Stopped backend processes${NC}"
        else
            echo -e "${YELLOW}No backend processes found${NC}"
        fi
    fi
}

function check_status() {
    echo -e "${YELLOW}Checking Backend Status...${NC}"
    echo ""
    
    # Check if backend is running
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend is RUNNING (PID: $PID)${NC}"
            echo -e "${GREEN}✓ Real-time data is ACTIVE${NC}"
            
            # Check API health
            response=$(curl -s http://192.168.0.208:8000/health 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo ""
                echo "API Health Check:"
                echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
            fi
        else
            echo -e "${RED}✗ Backend process not found (stale PID file)${NC}"
            rm "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}⚠ Backend is NOT running${NC}"
        echo -e "${YELLOW}→ App is using MOCK data${NC}"
    fi
    
    echo ""
}

function view_logs() {
    echo -e "${YELLOW}Backend Logs (last 20 lines):${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ -f "$PROJECT_DIR/backend.log" ]; then
        tail -20 "$PROJECT_DIR/backend.log"
    else
        echo "No log file found"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

function test_endpoints() {
    echo -e "${YELLOW}Testing API Endpoints...${NC}"
    echo ""
    
    BASE_URL="http://192.168.0.208:8000"
    
    # Test root endpoint
    echo "1. Root endpoint (/):"
    curl -s "$BASE_URL/" | python3 -m json.tool | head -15
    echo ""
    
    # Test market data
    echo "2. Real-time Market Data (/api/market/realtime):"
    curl -s "$BASE_URL/api/market/realtime" | python3 -m json.tool | head -15
    echo ""
    
    # Test sentiment
    echo "3. Sentiment Analysis (/api/sentiment):"
    curl -s -X POST "$BASE_URL/api/sentiment" \
        -H "Content-Type: application/json" \
        -d '{"text": "Oil prices surge on supply concerns"}' | python3 -m json.tool | head -15
    echo ""
}

# Main loop
while true; do
    show_menu
    read choice
    
    case $choice in
        1)
            start_backend
            ;;
        2)
            stop_backend
            ;;
        3)
            check_status
            ;;
        4)
            view_logs
            ;;
        5)
            test_endpoints
            ;;
        6)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done
