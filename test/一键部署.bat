@echo off
setlocal
cd /d "%~dp0.."
chcp 65001 >nul
set PYTHONIOENCODING=utf-8

echo ============================================
echo   P0 deploy - portfolio-astro
echo ============================================

set PY=python
where python 1>nul 2>nul
if errorlevel 1 (
  where py 1>nul 2>nul
  if errorlevel 1 (
    echo [ERROR] python not found in PATH
    pause
    exit /b 1
  )
  set PY=py
)

%PY% -c "import paramiko" 1>nul 2>nul
if errorlevel 1 (
  echo installing paramiko ...
  %PY% -m pip install paramiko
)

%PY% test\deploy_p0.py

echo.
echo ==== done. window stays open ====
pause
