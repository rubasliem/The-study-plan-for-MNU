@echo off
chcp 65001 > nul
title تشغيل نظام الخطة الدراسية - MNU

echo ==================================================
echo   🚀 جاري تشغيل نظام الخطة الدراسية
echo ==================================================
echo.

echo 1. جاري تشغيل Backend (FastAPI)...
start "MNU Backend" cmd /k "cd /d %~dp0backend && (python -m uvicorn main:app --port 8000 || py -m uvicorn main:app --port 8000)"

timeout /t 3 /nobreak > nul

echo 2. جاري تشغيل Frontend الفائق السرعة (Preview)...
start "MNU Frontend" cmd /k "cd /d %~dp0frontend && (if not exist dist npm run build) && npm run preview"

timeout /t 3 /nobreak > nul

echo 3. جاري تشغيل رابط الإنترنت الخارجي (Cloudflare Tunnel)...
start "Cloudflare Tunnel" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --url http://127.0.0.1:5173"

echo.
echo ==================================================
echo ✅ تم فتح نوافذ التشغيل بنجاح وبأعلى سرعة ممكنة!
echo --------------------------------------------------
echo - رابط البرنامج على جهازك:  http://localhost:5173
echo - الرابط الخارجي (للإنترنت): انسخه من نافذة Cloudflare (السطر المكتوب بالأخضر trycloudflare.com)
echo.
echo ⚠️ ملاحظة: اترك النوافذ مفتوحة طوال فترة استخدام البرنامج.
echo ==================================================
pause
