@echo off
echo ============================================================
echo   Sentiment Insights Engine - FastAPI Backend
echo ============================================================

:: Check if virtual environment exists
if not exist "venv\" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    echo [SETUP] Installing dependencies...
    call venv\Scripts\activate
    pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo [INFO] Starting server on http://localhost:8000
echo [INFO] API docs available at http://localhost:8000/docs
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
pause
