"""
PoC Agent Service — FastAPI Multi-Agent Consent System
"""
import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env from parent backend directory
env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"📄 Loaded .env from {env_path}")

# Add tools to path
sys.path.insert(0, str(Path(__file__).parent))

from pipeline import run_pipeline

app = FastAPI(title="PoC Agent Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://127.0.0.1:4000", "http://localhost:5502", "http://127.0.0.1:5502"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConsentRequest(BaseModel):
    procedure: str
    patient_name: str = "Patient"
    doctor_name: str = "Doctor"
    language: str = "en"


@app.get("/health")
def health():
    return {"status": "ok", "service": "PoC Agent Service"}


@app.post("/api/generate-consent")
def generate_consent(req: ConsentRequest):
    try:
        result = run_pipeline(
            procedure=req.procedure,
            patient_name=req.patient_name,
            doctor_name=req.doctor_name,
            language=req.language
        )
        return result
    except Exception as e:
        print(f"❌ Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PoC Agent Service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
