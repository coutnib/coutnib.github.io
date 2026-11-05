@echo off
REM Closet Computer launcher for Windows. Double-click, or run:  run.bat --lan
cd /d "%~dp0"
if not exist .venv (
  echo First run: setting up (one time, ~1 minute)...
  py -3 -m venv .venv || python -m venv .venv
  .venv\Scripts\python -m pip install --upgrade pip -q
  .venv\Scripts\pip install -r requirements.txt -q
  .venv\Scripts\pip install pillow-heif -q
)
.venv\Scripts\python -m app %*
pause
