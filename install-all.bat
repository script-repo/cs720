@echo off
echo ============================================
echo CS720 Platform - Installing All Dependencies
echo ============================================
echo.

echo [1/6] Installing root dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :error

echo.
echo [2/6] Installing shared dependencies...
cd shared
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :error
cd ..

echo.
echo [3/6] Installing backend dependencies...
cd services\backend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :error
cd ..\..

echo.
echo [4/6] Installing proxy dependencies...
cd services\proxy
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :error
cd ..\..

echo.
echo [5/6] Installing AI service dependencies...
cd services\ai-service
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :error
cd ..\..

echo.
echo [6/6] Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :error
cd ..

echo.
echo ============================================
echo SUCCESS! All dependencies installed
echo ============================================
echo.
echo Next steps:
echo 1. Build shared library: npm run build:shared
echo 2. Start all services: npm run dev
echo 3. Check health: npm run health
echo.
goto :end

:error
echo.
echo ============================================
echo ERROR! Installation failed
echo ============================================
echo Please check the error messages above
echo.
exit /b 1

:end
