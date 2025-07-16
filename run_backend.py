#!/usr/bin/env python3
"""
Start the FastAPI backend server
"""
import uvicorn
import os

if __name__ == "__main__":
    # Change to backend directory
    os.chdir("backend")
    
    # Start the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )