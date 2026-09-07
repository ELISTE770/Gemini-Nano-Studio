@echo off
chcp 65001 >nul
title Gemini Nano Studio
cd /d "%~dp0"

echo =================================================================
echo   Gemini Nano Studio - מפעיל שרת מקומי ואפליקציה...
echo =================================================================
echo.

:: 1. Search for Python in PATH, Python Launcher, and common Windows locations
set "PYTHON_EXE="

where pythonw.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PYTHON_EXE=pythonw.exe"
    goto :FoundPython
)

where python.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PYTHON_EXE=python.exe"
    goto :FoundPython
)

where py.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PYTHON_EXE=py.exe -3"
    goto :FoundPython
)

for /d %%D in ("%LocalAppData%\Programs\Python\Python3*") do (
    if exist "%%D\pythonw.exe" (
        set "PYTHON_EXE=%%D\pythonw.exe"
        goto :FoundPython
    )
    if exist "%%D\python.exe" (
        set "PYTHON_EXE=%%D\python.exe"
        goto :FoundPython
    )
)

for /d %%D in ("%ProgramFiles%\Python3*") do (
    if exist "%%D\pythonw.exe" (
        set "PYTHON_EXE=%%D\pythonw.exe"
        goto :FoundPython
    )
    if exist "%%D\python.exe" (
        set "PYTHON_EXE=%%D\python.exe"
        goto :FoundPython
    )
)

for /d %%D in ("%ProgramFiles(x86)%\Python3*") do (
    if exist "%%D\pythonw.exe" (
        set "PYTHON_EXE=%%D\pythonw.exe"
        goto :FoundPython
    )
)

:: If Python was not found anywhere:
echo [!] שים לב: לא נמצאה התקנת Python במחשב שלך.
echo     האפליקציה תיפתח כעת ישירות בדפדפן (ללא שרת פייתון מקומי).
echo.
echo     * טיפ: כדי להפעיל הרצת סקריפטים ו-API למפתחים,
echo       מומלץ להתקין פייתון מ: https://www.python.org/downloads/
echo.
echo =================================================================
echo פותח את ממשק Gemini Nano Studio בדפדפן...
start "" gemini_nano_chat.html
timeout /t 3 >nul
exit /b 0

:FoundPython
echo [+] זוהה מנוע פייתון: %PYTHON_EXE%
echo [+] מפעיל את השרת המקומי בפורט 8765...

:: Check if server is already running on port 8765
powershell -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 8765)).Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [*] השרת המקומי כבר פועל. פותח את האפליקציה...
    start "" http://127.0.0.1:8765/gemini_nano_chat.html
    exit /b 0
)

:: Launch Python server
start "" %PYTHON_EXE% Gemini_Nano.pyw

:: Give the server a brief moment to initialize
timeout /t 1 /nobreak >nul

exit /b 0
