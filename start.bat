@echo off
chcp 65001 > nul
cd /d "%~dp0"
title MNU Study Plan

echo ==================================================
echo   Starting MNU Study Plan System
echo ==================================================
echo.

echo [1/3] Starting Backend...
start "MNU Backend" cmd /k "cd /d %~dp0backend && (py -m pip install -r requirements.txt || python -m pip install -r requirements.txt) && (python -m uvicorn main:app --port 8000 --reload || py -m uvicorn main:app --port 8000 --reload)"

ping -n 3 127.0.0.1 > nul

echo [2/3] Starting Frontend...
start "MNU Frontend" cmd /k "cd /d %~dp0frontend && (npm.cmd run preview || npm run preview)"

ping -n 3 127.0.0.1 > nul

echo [3/3] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --url http://127.0.0.1:5173"

echo.
echo ==================================================
echo System is running!
echo Local URL: http://localhost:5173
echo External URL: Check the Cloudflare Tunnel window
echo ==================================================
pause
