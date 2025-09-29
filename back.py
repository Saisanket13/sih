"""
FastAPI backend skeleton for AgriAI prototype
- Provides endpoints:
  POST /api/predict    -> returns yield prediction + confidence and explanation
  GET  /api/weather    -> mocked weather data (replace with real API integration)
  GET  /api/soil       -> mocked soil data (replace with sensor integration)
  POST /api/train      -> (dev) trains a simple XGBoost baseline on synthetic data and saves model

How to run:
1. python -m venv venv
2. source venv/bin/activate   (or venv\Scripts\activate on Windows)
3. pip install -r requirements.txt
4. uvicorn backend-fastapi-example:app --reload --port 8000

Notes:
- Replace synthetic data / mock endpoints with real dataset ingestion and model training.
- This example uses joblib to persist a sklearn/XGBoost model.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import numpy as np
import os
import joblib

# If xgboost not available, scikit-learn fallback
try:
    from xgboost import XGBRegressor
    MODEL_LIB = 'xgboost'
except Exception:
    from sklearn.ensemble import RandomForestRegressor
    MODEL_LIB = 'sklearn'

MODEL_PATH = 'models/agri_yield_model.pkl'
os.makedirs('models', exist_ok=True)

app = FastAPI(title='AgriAI Backend - Prototype')

# ---------- Pydantic schemas ----------
class FarmFeatures(BaseModel):
    crop: str
    areaHa: float
    soil_ph: float
    soil_moisture_pct: float
    organic_matter_pct: float
    avg_temp_c: Optional[float] = None
    rainfall_last_30d_mm: Optional[float] = None

class PredictResponse(BaseModel):
    yield_tons: float
    confidence: float
    explanation: Dict[str, Any]

# ---------- Utility: load or train model ----------

def train_and_save_dummy_model(path: str = MODEL_PATH):
    """Train a small model on synthetic data for demo purposes and save it."""
    # Create synthetic dataset
    rng = np.random.RandomState(42)
    n = 1000
    # features: area, ph, moisture, organic, temp, rainfall, crop encoded as simple mapping
    crop_map = {'wheat': 0, 'rice': 1, 'maize': 2, 'cotton': 3}
    crops = rng.randint(0, 4, size=n)
    area = rng.uniform(0.1, 5.0, size=n)
    ph = rng.normal(6.5, 0.8, size=n)
    moisture = rng.uniform(10, 40, size=n)
    organic = rng.uniform(0.5, 4.0, size=n)
    temp = rng.normal(25, 3, size=n)
    rainfall = rng.uniform(0, 200, size=n)

    # synthetic yield formula with noise
    base = np.array([3.0, 4.0, 5.0, 2.5])
    yield_t = base[crops] * (moisture/30) * (1 - np.abs(ph-6.5)/10) * (1 + organic/10) * (1 + (rainfall-50)/300)
    yield_t = np.maximum(0.1, yield_t + rng.normal(0, 0.3, size=n))

    X = np.vstack([area, ph, moisture, organic, temp, rainfall, crops]).T
    y = yield_t

    if MODEL_LIB == 'xgboost':
        model = XGBRegressor(n_estimators=100, max_depth=4, random_state=42)
    else:
        model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)

    model.fit(X, y)
    joblib.dump({'model': model, 'crop_map': {'wheat':0,'rice':1,'maize':2,'cotton':3}}, path)
    return model


def load_model(path: str = MODEL_PATH):
    if not os.path.exists(path):
        print('Model not found; training a dummy model...')
        model = train_and_save_dummy_model(path)
        return {'model': model, 'crop_map': {'wheat':0,'rice':1,'maize':2,'cotton':3}}
    else:
        return joblib.load(path)

MODEL_STORE = load_model()
MODEL = MODEL_STORE['model']
CROP_MAP = MODEL_STORE.get('crop_map', {'wheat':0,'rice':1,'maize':2,'cotton':3})

# ---------- Mocked data endpoints (replace with real integrations) ----------
@app.get('/api/weather')
def get_weather(lat: Optional[float] = None, lon: Optional[float] = None):
    """Return mocked weather summary or integrate with OpenWeather / NOAA / local weather API."""
    # For production, call external API and return structured data.
    return {
        'tempC': 28.5,
        'rainNext7DaysMm': 15,
        'condition': 'Partly cloudy'
    }

@app.get('/api/soil')
def get_soil(plot_id: Optional[str] = None):
    """Return mocked soil metrics or query IoT sensors / soil database."""
    return {
        'ph': 6.4,
        'moisturePct': 23,
        'organicMatterPct': 1.9
    }

# ---------- Training endpoint (development only) ----------
@app.post('/api/train')
def train_endpoint():
    """Train a new model on server (dev). In production this should be a batch job in a pipeline."""
    model = train_and_save_dummy_model(MODEL_PATH)
    return {'status': 'trained', 'model_lib': MODEL_LIB}

# ---------- Prediction endpoint ----------
@app.post('/api/predict', response_model=PredictResponse)
def predict(features: FarmFeatures):
    # Validate crop
    crop = features.crop.lower()
    if crop not in CROP_MAP:
        raise HTTPException(status_code=400, detail=f'Unsupported crop: {crop}')

    # Convert features into model input vector
    crop_code = CROP_MAP[crop]
    temp = features.avg_temp_c if features.avg_temp_c is not None else 25.0
    rain30 = features.rainfall_last_30d_mm if features.rainfall_last_30d_mm is not None else 50.0

    x = np.array([[features.areaHa, features.soil_ph, features.soil_moisture_pct, features.organic_matter_pct, temp, rain30, crop_code]])

    pred = MODEL.predict(x)[0]

    # Very simple confidence heuristic: based on distance from training ranges
    conf = 0.75
    try:
        # if the model supports predict_proba-like uncertainty use that; otherwise use heuristic
        # Here we clamp values
        if pred <= 0:
            pred = 0.05
        conf = float(np.clip(0.5 + 0.5 * (features.soil_moisture_pct / 40.0), 0.3, 0.95))
    except Exception:
        conf = 0.6

    # Simple explanation: contribution of features (not SHAP, but human-readable)
    explanation = {
        'why': 'Prediction combines crop baseline and current soil + recent weather',
        'key_factors': {
            'soil_moisture_pct': features.soil_moisture_pct,
            'soil_ph': features.soil_ph,
            'organic_matter_pct': features.organic_matter_pct,
            'recent_rain_mm': rain30
        }
    }

    return PredictResponse(yield_tons=round(float(pred), 3), confidence=round(conf, 3), explanation=explanation)

# ---------- Health check ----------
@app.get('/health')
def health():
    return {'status':'ok', 'model_lib': MODEL_LIB}

# ---------- If run as script ----------
if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend-fastapi-example:app', host='0.0.0.0', port=8000, reload=True)
