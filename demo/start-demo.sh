#!/bin/bash

# 🚀 Ultimate Streaming Package Demo Launcher
# This script sets up and starts the real-time order management demo

echo "🚀 Starting Ultimate Streaming Package Demo..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_success "npm $(npm -v) detected"

# Navigate to demo directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

print_status "Setting up demo environment..."

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
if npm install; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd ../frontend
if npm install; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ..

print_success "All dependencies installed successfully!"
echo ""
print_status "Starting demo servers..."

# Function to handle cleanup on script termination
cleanup() {
    print_warning "Shutting down demo servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    print_success "Demo servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
print_status "Starting backend server on port 5001..."
cd backend
PORT=5001 npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend server started (PID: $BACKEND_PID)"
else
    print_error "Failed to start backend server"
    exit 1
fi

# Start frontend server
print_status "Starting frontend server on port 3000..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

# Check if frontend is running
if kill -0 $FRONTEND_PID 2>/dev/null; then
    print_success "Frontend server started (PID: $FRONTEND_PID)"
else
    print_error "Failed to start frontend server"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Demo is now running!"
echo "================================================"
echo ""
echo -e "${GREEN}✨ Access the demo at: http://localhost:3000${NC}"
echo -e "${GREEN}🌐 Backend API running at: http://localhost:5001${NC}"
echo ""
echo "📊 Available Views:"
echo "   • Dashboard     - Real-time overview and metrics"
echo "   • Customer View - Order placement and tracking"  
echo "   • Admin View    - Order and inventory management"
echo ""
echo "🎮 Demo Features:"
echo "   • Real-time order updates across all views"
echo "   • Live inventory synchronization"
echo "   • Instant notifications for all changes"
echo "   • Sub-millisecond latency streaming"
echo ""
echo "🔧 Demo Controls:"
echo "   • Use simulation buttons to generate activity"
echo "   • Open multiple tabs to see real-time sync"
echo "   • Try customer and admin views simultaneously"
echo ""
echo -e "${YELLOW}💡 Pro Tip: Open the app in multiple browser windows to see real-time synchronization!${NC}"
echo ""
echo -e "${BLUE}🎯 This demo showcases why our Ultimate Streaming Package makes every other real-time solution obsolete!${NC}"
echo ""
echo "Press Ctrl+C to stop the demo servers"

# Keep the script running and monitor the processes
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend server has stopped unexpectedly"
        cleanup
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend server has stopped unexpectedly"
        cleanup  
    fi
    
    sleep 5
done 