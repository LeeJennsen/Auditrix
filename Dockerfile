# --- AI-Powered Audit Lifecycle Platform: container image ---
FROM python:3.11-slim

# Prevent .pyc files and enable unbuffered stdout for cleaner container logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (including the frontend it serves at "/")
COPY main.py ./
COPY static/ ./static/

# Non-root user for defense-in-depth
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /data \
    && chown appuser:appuser /data
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
