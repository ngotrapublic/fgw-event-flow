@echo off
title Event Management Server (Port 5000)
cd /d "%~dp0server"
echo ===================================================
echo  Starting Event Management Backend Server (:5000)...
echo ===================================================
node index.js
pause

