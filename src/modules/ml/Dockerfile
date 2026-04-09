# ml-service/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install deps first (layer cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Model files are persisted to a volume so retraining survives restarts
VOLUME ["/app/models"]
ENV MODEL_PATH=/app/models/model.joblib
ENV SCALER_PATH=/app/models/scaler.joblib

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

# Use gunicorn in production (4 workers)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "60", "app:app"]