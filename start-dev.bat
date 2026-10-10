@echo off
chcp 65001 > nul
echo ========================================================
echo   WorkSync Ver2 - Khởi động hệ thống Development
echo ========================================================
echo.

echo [1/3] Đang khởi động Docker Database (PostgreSQL 5433, Redis 6380)...
docker compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [CANH BAO] Docker chua bat! Hay mo Docker Desktop truoc khi chay script nay.
    echo.
)

echo [2/3] Mở Terminal Backend (NestJS - Port 4000)...
start "WorkSync Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"

echo [3/3] Mở Terminal Frontend (Vite React - Port 5173)...
start "WorkSync Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   Backend đang chạy tại:  http://localhost:4000/api
echo   Frontend đang chạy tại: http://localhost:5173
echo ========================================================
echo.
pause
