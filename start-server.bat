@echo off
title RS Games Portal
echo ======================================================
echo           Starting RS Games Portal (430+ Games)
echo ======================================================
echo.
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000
echo.
node server.js
if %errorlevel% neq 0 (
    echo.
    echo Node.js was not detected in system PATH.
    echo Opening index.html directly in your default browser...
    start index.html
)
pause
