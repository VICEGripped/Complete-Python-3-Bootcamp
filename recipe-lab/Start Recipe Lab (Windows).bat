@echo off
REM Double-click this file to start Recipe Lab on Windows.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js isnt installed yet.
  echo   Download the LTS version from https://nodejs.org, install it, then double-click this file again.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo   First run: installing - takes about a minute...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo   Install failed.
    pause
    exit /b 1
  )
)
node server.js
pause
