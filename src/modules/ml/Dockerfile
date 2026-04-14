# ml-service/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install deps first (layer cache friendly)
COPY src/modules/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/modules/ml/app.py .

# Copy model files if they exist
COPY src/modules/ml/model.joblib ./models/ 2>/dev/null || true
COPY src/modules/ml/scaler.joblib ./models/ 2>/dev/null || true

# Model files paths (volumes configured in Railway dashboard)
ENV MODEL_PATH=/app/models/model.joblib
ENV SCALER_PATH=/app/models/scaler.joblib

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

# Use gunicorn in production (4 workers)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "60", "app:app"]