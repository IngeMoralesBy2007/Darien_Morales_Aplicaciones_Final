@echo off
title Nexus Analytic - Plataforma de IA
setlocal enabledelayedexpansion

echo.
echo ======================================================
echo           INICIANDO NEXUS ANALYTIC (PRO)
echo ======================================================
echo.

:: Limpieza de puertos 8000 y 8001 para evitar conflictos
echo [+] Verificando puertos 8000 y 8001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: Iniciar Backend
echo [+] Lanzando Servidor AI (Backend: 8000)...
start "Nexus Backend" cmd /k "call venv\Scripts\activate.bat && cd backend && uvicorn main:app --host 127.0.0.1 --port 8000"

:: Iniciar Frontend
echo [+] Lanzando Interfaz Ejecutiva (Frontend: 8001)...
start "Nexus Frontend" cmd /k "cd frontend && npm run dev"

echo [+] Sincronizando servicios (esperando 8 segundos)...
timeout /t 8 /nobreak > nul

echo [+] Lanzando aplicacion en el navegador...
:: Abrir con localhost para mayor compatibilidad con Vite
start http://localhost:8001

echo.
echo ------------------------------------------------------
echo  Backend: http://127.0.0.1:8000
echo  Frontend: http://localhost:8001
echo ------------------------------------------------------
echo.
echo Presiona cualquier tecla para cerrar este asistente...
pause > nul
