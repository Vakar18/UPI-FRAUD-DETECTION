#!/bin/bash
# ML Model Training via Docker
# This runs the training inside a Docker container with all dependencies
# Usage: ./train-docker.sh [synthetic|csv|mongodb|tune]

set -e

OPTION="${1:-synthetic}"
WORK_DIR="$(pwd)"
IMAGE_NAME="fraud-detection-ml-train"

echo "🚀 UPI Fraud Detection Model Training (Docker)"
echo "=============================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker not found"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✓ Docker found: $(docker --version)"

# Build Docker image for training
echo ""
echo "🔨 Building Docker image..."
docker build -t "$IMAGE_NAME" -f Dockerfile . --quiet || {
    echo "❌ Failed to build Docker image"
    exit 1
}
echo "✓ Image built successfully"

# Run training in container
echo ""
case "$OPTION" in
    synthetic)
        echo "🤖 Training with synthetic data..."
        TRAIN_CMD="python3 train.py --data-source synthetic"
        ;;
    
    csv)
        echo "📊 Training with sample CSV data..."
        TRAIN_CMD="python3 train.py --data-source csv --csv-path sample-training-data.csv"
        ;;
    
    mongodb)
        echo "🗄️  Training with MongoDB data..."
        echo "   (Note: Ensure MongoDB is running: docker-compose up -d mongo)"
        TRAIN_CMD="python3 train.py --data-source mongodb"
        ;;
    
    tune)
        echo "⚙️  Training with hyperparameter tuning..."
        TRAIN_CMD="python3 train.py --data-source synthetic --hyperparameter-tune"
        ;;
    
    help)
        echo "Usage: ./train-docker.sh [option]"
        echo ""
        echo "Options:"
        echo "  synthetic   Train with synthetic data (fast, recommended for testing)"
        echo "  csv         Train with sample CSV (fast, good for demo)"
        echo "  mongodb     Train with real MongoDB data (needs running MongoDB)"
        echo "  tune        Train with hyperparameter tuning (slow, improves accuracy)"
        echo "  help        Show this message"
        echo ""
        exit 0
        ;;
    
    *)
        echo "❌ Unknown option: $OPTION"
        echo "Use './train-docker.sh help' for usage"
        exit 1
        ;;
esac

echo ""
# Create models directory if it doesn't exist
mkdir -p "$WORK_DIR/models"

docker run --rm \
    -v "$WORK_DIR:/app" \
    -v "$WORK_DIR/models:/app/models" \
    -w /app \
    -e MONGO_URI="${MONGO_URI:-mongodb://mongo:27017}" \
    -e MONGO_DB="${MONGO_DB:-upi_fraud_db}" \
    "$IMAGE_NAME" \
    bash -c "$TRAIN_CMD"

# Copy model files to current directory for convenience
cp -f "$WORK_DIR/models"/*.joblib . 2>/dev/null || true

echo ""
echo "=============================================="
echo "✅ Training complete!"
echo ""
echo "📄 Output files:"
echo "   • model.joblib          – Trained model"
echo "   • scaler.joblib         – Feature scaler"
echo "   • model_metadata.json   – Training metrics"
echo "   • roc_curve.png         – ROC curve chart"
echo ""
echo "📊 Next steps:"
echo "   1. Check model_metadata.json for accuracy metrics"
echo "   2. View roc_curve.png to see performance"
echo "   3. Copy model*.joblib files to your service"
echo "   4. Restart ML service to load new model"
echo ""
