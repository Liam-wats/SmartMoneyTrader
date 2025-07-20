#!/usr/bin/env python3
"""
Start both FastAPI backend and Streamlit frontend
"""
import subprocess
import sys
import time
import threading
import os

def start_backend():
    """Start FastAPI backend"""
    print("🚀 Starting FastAPI backend...")
    os.chdir("backend")
    subprocess.run([
        sys.executable, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", "5000",
        "--reload"
    ])

def start_frontend():
    """Start Streamlit frontend"""
    print("🌐 Starting Streamlit frontend...")
    time.sleep(3)  # Wait for backend to start
    os.chdir("frontend")
    subprocess.run([
        sys.executable, "-m", "streamlit", "run", "main.py",
        "--server.port=8501",
        "--server.address=0.0.0.0",
        "--server.headless=true",
        "--browser.gatherUsageStats=false"
    ])

if __name__ == "__main__":
    print("🏛️ Starting SMC Trading Platform with Python Stack...")
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=start_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Start frontend in main thread
    start_frontend()