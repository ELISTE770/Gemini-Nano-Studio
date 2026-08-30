@echo off
chcp 65001 >nul
title Gemini Nano Studio Ultra
cd /d "%~dp0"
echo =================================================================
echo   מפעיל את Gemini Nano Studio Ultra (שרת מקומי + אפליקציה)...
echo =================================================================
start "" pythonw.exe Gemini_Nano.pyw
exit
