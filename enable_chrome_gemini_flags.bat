@echo off
chcp 65001 >nul
title Gemini Nano - כלי עזר להפעלת דגלי כרום ובדיקת מודל
echo =================================================================
echo   בדיקת והגדרת דגלי Chrome עבור Gemini Nano (Built-in AI)
echo =================================================================
echo.
echo הדפדפן ייפתח כעת בלשוניות ההגדרה הנדרשות:
echo.
echo  [1] Prompt API for Gemini Nano:
echo      - הגדר כ: 'Enabled'
echo.
echo  [2] Enables optimization guide on device:
echo      - הגדר כ: 'Enabled BypassPerfRequirement'
echo.
echo  [3] בדיקת הורדת המודל (Components):
echo      - חפש: 'Optimization Guide On Device Model'
echo      - לחץ על: 'Check for update' אם הגרסה היא 0.0.0.0
echo.
echo  [4] האצת חומרה (GPU):
echo      - וודא שהאצת חומרה מופעלת ב-chrome://settings/system
echo.
echo =================================================================
pause
start chrome.exe "chrome://flags/#prompt-api-for-gemini-nano"
start chrome.exe "chrome://flags/#optimization-guide-on-device-model"
start chrome.exe "chrome://components"
start chrome.exe "chrome://settings/system"
echo.
echo לאחר שינוי הדגלים, חובה ללחוץ על Relaunch בתחתית כרום!
echo.
pause
