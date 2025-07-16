#!/usr/bin/env python3
"""
Start the Streamlit frontend server
"""
import subprocess
import os
import sys

if __name__ == "__main__":
    # Change to frontend directory
    os.chdir("frontend")
    
    # Start the Streamlit server
    subprocess.run([
        sys.executable, "-m", "streamlit", "run", "main.py",
        "--server.port=8501",
        "--server.address=0.0.0.0",
        "--server.headless=true",
        "--browser.gatherUsageStats=false"
    ])