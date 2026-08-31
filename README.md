# 🌟 Gemini Nano Studio (v0.8.9)

<div align="center">

![Gemini Nano](gemini_logo.png)

**100% Private, On-Device, High-Speed Local AI Studio Powered by Chrome's Built-in Gemini Nano Model.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.8.9-emerald.svg)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-indigo.svg)]()

[עברית](#-תכונות-מרכזיות) | [English](#-key-features) | [Quick Start](#-quick-start) | [Troubleshooting](#-troubleshooting)

</div>

---

## 🚀 Key Features

- **🔒 100% Offline & Private:** Runs entirely on your machine via Chrome's experimental Prompt API. Zero telemetry, zero cloud data transfer.
- **🎨 Interactive Live Canvas:** Render interactive HTML/JS/CSS applications side-by-side with live code editing and instant preview.
- **⚡ Local Python & JS Execution:** Run Python code natively on your local machine with console output streaming and timeout protection.
- **🌐 Developer Gateway (OpenAI Compatible API):** Generate API keys and connect third-party applications or scripts to your local Gemini Nano model (/v1/chat/completions).
- **📚 Local Document RAG:** Drop code files, text, JSON, and PDFs into your local Knowledge Base for instant context-aware question answering.
- **🌐 Full Bilingual Interface:** Complete Hebrew (RTL) and English (LTR) language support with strict multi-language question mirroring.
- **🩺 Integrated System Diagnostics:** Real-time health check for the local server, browser Prompt API engine, model weights, and hardware GPU acceleration.

---

## ⚡ Quick Start

### 1. Enable Chrome Gemini Nano Flags
1. Open Google Chrome (or Chrome Canary/Dev).
2. Visit chrome://flags/#prompt-api-for-gemini-nano and set to **Enabled**.
3. Visit chrome://flags/#optimization-guide-on-device-model and set to **Enabled BypassPerfRequirement**.
4. Restart Google Chrome.
5. Visit chrome://components and find **Optimization Guide On Device Model** ➔ Click **Check for update** until the version is downloaded.

### 2. Launch Gemini Nano Studio
Double-click Start_Gemini_Nano.bat or run:
`ash
python Gemini_Nano.pyw
`
The studio will automatically open in your browser at http://127.0.0.1:8765.

---

## 🇮🇱 תכונות מרכזיות (בעברית)

- **פרטיות מוחלטת:** כל השיחות והעיבוד נעשים מקומית במחשב שלך ללא שליחת מידע לענן.
- **Canvas חי ואינטראקטיבי:** תצוגה מקדימה חיה של דפי אינטרנט, תרשימים ומשחקים עם אפשרות לעריכת קוד בזמן אמת והרחבה למסך מלא.
- **הרצת Python מקומית:** כתיבה והרצה ישירה של קוד פייתון במחשב שלך עם חלון פלט ייעודי.
- **שער מפתחים (API):** יצירת מפתחות API וחיבור תוכנות חיצוניות למודל מקומי בתקן OpenAI.
- **מאגר ידע (RAG):** העלאת מסמכי PDF, טקסט וקוד לחיפוש תשובות מבוססות תוכן.
- **תמיכה מלאה בעברית ובאנגלית:** מעבר מהיר בין שפות ממשק ומענה אוטומטי בשפת הפנייה.

---

## 📦 What's New in v0.8.9

- 🔒 **Security Hardening:** Strict local Origin validation on dangerous endpoints (/api/run_python, /api/config) and SSRF protection on /api/fetch_url.
- 🛠️ **Critical Runtime Fixes:** Fixed Canvas templates loading (loadArtifactIntoCanvas), PDF text extraction (xtractPdfText), and eliminated duplicate DOM IDs.
- 🎨 **Canvas Full-Screen:** Added responsive toggle and 100% full-screen maximization mode.
- 🌐 **Comprehensive i18n:** 100% translation coverage for all UI modals, buttons, badges, and toasts.
- ⚡ **Performance:** Throttled streaming message renderer with equestAnimationFrame and optimized watchdog heartbeat.

---

## 📄 License
MIT License. Free for personal and commercial use.
