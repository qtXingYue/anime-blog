@echo off
setlocal
cd /d "%~dp0.."
chcp 65001 >nul
set "PYTHONIOENCODING=utf-8"

echo ============================================
echo   P0 deploy - portfolio-astro
echo ============================================

set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY ( where py >nul 2>nul && set "PY=py" )
if not defined PY ( where python3 >nul 2>nul && set "PY=python3" )
if not defined PY (
  echo [ERROR] Python not found in PATH.
  echo Open a cmd window, run:  where python
  echo then tell Claude what it prints.
  pause
  exit /b 1
)
echo Using %PY%

%PY% -c "import paramiko" 1>nul 2>nul
if errorlevel 1 (
  echo installing paramiko ...
  %PY% -m pip install paramiko
)

%PY% test\deploy_p0.py

echo.
echo ==== finished. window stays open, copy the output to Claude ====
pause
