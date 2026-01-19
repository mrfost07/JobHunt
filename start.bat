@echo off
echo Starting JobHunt Application...
echo.

:: Start backend in a new window
start "JobHunt Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 /nobreak > nul

:: Start frontend in a new window
start "JobHunt Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Both servers are starting in separate windows.
echo Press any key to open the app in your browser...
pause > nul

start http://localhost:5173
