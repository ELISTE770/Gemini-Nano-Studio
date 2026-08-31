@echo off
chcp 65001 >nul
title Gemini Nano Studio
cd /d "%~dp0"
echo =================================================================
echo   מפעיל את Gemini Nano Studio (שרת מקומי + אפליקציה)...
echo =================================================================
start "" pythonw.exe Gemini_Nano.pyw
exit
