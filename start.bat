@echo off
chcp 65001 > nul
title تشغيل نظام الخطة الدراسية - MNU

echo ==================================================
echo   🚀 جاري تشغيل نظام الخطة الدراسية بدون Docker
echo ==================================================
echo.

echo 1. جاري تشغيل Backend (FastAPI)...
start "MNU Backend" cmd /k "cd /d %~dp0backend && (python -m uvicorn main:app --reload --port 8000 || py -m uvicorn main:app --reload --port 8000)"

timeout /t 3 /nobreak > nul

echo 2. جاري تشغيل Frontend (Vite)...
start "MNU Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo 3. جاري تشغيل رابط الإنترنت الخارجي (Cloudflare Tunnel)...
start "Cloudflare Tunnel" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --url http://localhost:5173"

echo.
echo ==================================================
echo ✅ تم فتح نوافذ التشغيل بنجاح!
echo --------------------------------------------------
echo - رابط البرنامج على جهازك:  http://localhost:5173
echo - الرابط الخارجي (للإنترنت): انسخه من نافذة Cloudflare (السطر المكتوب بالأخضر trycloudflare.com)
echo.
echo ⚠️ ملاحظة: اترك النوافذ مفتوحة طوال فترة استخدام البرنامج.
echo ==================================================
pause
