@echo off
title Event Management System Launcher
echo ===================================================
echo  Starting Event Management System...
echo ===================================================
cd /d "%~dp0server"
start "Backend Server (Port 5000)" cmd /k "node index.js"
cd /d "%~dp0client"
start "Frontend Client (Port 5173)" cmd /k "npm run dev"
echo Both Backend (:5000) and Frontend (:5173) are launched!
timeout /t 5
