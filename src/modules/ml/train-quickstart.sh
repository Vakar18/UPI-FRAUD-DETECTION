#!/bin/bash
# Quick-start script to train the Isolation Forest model
# Usage: ./train-quickstart.sh [option]
#
# Options:
#   synthetic  - Train with synthetic data (fast, ~1 min)
#   csv        - Train with sample CSV file (fast, ~1 min)
#   mongodb    - Train with real MongoDB data (needs running MongoDB)
#   tune       - Train with hyperparameter tuning (slow, ~10 min)
#   help       - Show this help

set -e

cd "$(dirname "$0")"

OPTION="${1:-synthetic}"
VENV_DIR=".venv"

echo "🚀 UPI Fraud Detection Model Training"
echo "======================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 not found"
    exit 1
fi

echo "✓ Python 3 found"

# Setup virtual environment
echo "📦 Setting up virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR" || {
        echo "❌ Failed to create virtual environment"
        exit 1
    }
    echo "   ✓ Virtual environment created"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q --upgrade pip setuptools wheel
pip install -q -r requirements.txt || {
    echo "❌ Failed to install dependencies"
    exit 1
}
echo "✓ Dependencies ready"

case "$OPTION" in
    synthetic)
        echo ""
        echo "🤖 Training with synthetic data..."
        echo "   (This is a good starting point for testing)"
        echo ""
        python3 train.py --data-source synthetic
        ;;
    
    csv)
        echo ""
        echo "📊 Training with sample CSV data..."
        echo "   (40 sample transactions with fraud labels)"
        echo ""
        python3 train.py --data-source csv --csv-path sample-training-data.csv
        ;;
    
    mongodb)
        echo ""
        echo "🗄️  Training with MongoDB data..."
        echo "   (Requires MongoDB running at $MONGO_URI)"
        echo ""
        python3 train.py --data-source mongodb
        ;;
    
    tune)
        echo ""
        echo "⚙️  Training with hyperparameter tuning..."
        echo "   (This takes ~10 minutes but can improve accuracy)"
        echo ""
        python3 train.py --data-source synthetic --hyperparameter-tune
        ;;
    
    help)
        echo ""
        echo "Usage: ./train-quickstart.sh [option]"
        echo ""
        echo "Options:"
        echo "  synthetic   Train with synthetic data (fast, recommended for testing)"
        echo "  csv         Train with sample CSV (fast, good for demo)"
        echo "  mongodb     Train with real MongoDB data (needs running MongoDB)"
        echo "  tune        Train with hyperparameter tuning (slow, improves accuracy)"
        echo "  help        Show this message"
        echo ""
        echo "Examples:"
        echo "  ./train-quickstart.sh synthetic"
        echo "  ./train-quickstart.sh mongodb"
        echo "  ./train-quickstart.sh tune"
        echo ""
        ;;
    
    *)
        echo "❌ Unknown option: $OPTION"
        echo "Use './train-quickstart.sh help' for usage"
        exit 1
        ;;
esac

echo ""
echo "======================================"
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
echo "   3. Copy model*.joblib to production"
echo "   4. Restart the ML service to load new model"
echo ""
echo "📚 For details, see: TRAINING_GUIDE.md"
echo ""
