@echo off
echo Starting Healthcare Microservices...
echo.

echo [1/6] Starting Patient Service (port 3001)...
start "Patient Service" cmd /k "cd /d %~dp0patient-service && npm start"

timeout /t 2 /nobreak >nul

echo [2/6] Starting Appointment Service (port 3002)...
start "Appointment Service" cmd /k "cd /d %~dp0appointment-service && npm start"

timeout /t 2 /nobreak >nul

echo [3/6] Starting Payment Service (port 3003)...
start "Payment Service" cmd /k "cd /d %~dp0payment-service && npm start"

timeout /t 2 /nobreak >nul

echo [4/6] Starting Doctor Service (port 3004)...
start "Doctor Service" cmd /k "cd /d %~dp0doctor-service && npm start"

timeout /t 2 /nobreak >nul

echo [5/6] Starting Telemedicine Service (port 3005)...
start "Telemedicine Service" cmd /k "cd /d %~dp0telemedicine-service && npm start"

timeout /t 2 /nobreak >nul

echo [6/6] Starting Frontend (port 5173)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo All services started! Open your browser at:
echo   http://localhost:5173
echo.
echo Service ports:
echo   Patient Service    -> http://localhost:3001
echo   Appointment Service-> http://localhost:3002
echo   Payment Service    -> http://localhost:3003
echo   Doctor Service     -> http://localhost:3004
echo   Telemedicine       -> http://localhost:3005
echo   Frontend           -> http://localhost:5173
echo ============================================================
pause
