// This file has been temporarily replaced with Python server
// To run the Python stack: python3 python_server.py
// To revert to Node.js: git checkout server/index.ts

import { spawn } from "child_process";

console.log("🔄 Switching to Python Stack...");
console.log("🐍 Starting FastAPI + Python Frontend");

// Start the Python server
const pythonProcess = spawn("python3", ["python_server.py"], {
  stdio: "inherit",
  cwd: process.cwd()
});

pythonProcess.on("error", (error) => {
  console.error("❌ Failed to start Python server:", error);
  process.exit(1);
});

pythonProcess.on("close", (code) => {
  console.log(`🛑 Python server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down...");
  pythonProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down...");
  pythonProcess.kill("SIGTERM");
});

// Original Node.js code preserved below (commented out)
/*
Original Express server code has been temporarily replaced with Python server.
To restore Node.js functionality, revert this file or run the old-dev script.
*/
