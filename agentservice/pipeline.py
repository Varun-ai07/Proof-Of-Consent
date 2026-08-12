"""
Consent Generation Pipeline — 6 stages
1. Cache check
2. Research (no LLM)
3. Write content (1 LLM call)
4. Enrich media (no LLM)
5. Medical review (1 LLM call)
6. Cache + return
"""
import time
from tools.llm import generate_json, generate
from tools.research import research_procedure
from tools.media import enrich_media
from tools.cache import get_cached, set_cached


# ═══════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════

CONTENT_PROMPT = """You are a medical consent form expert. Generate a patient-friendly consent form for "{procedure}".

Research context:
{context}

Patient: {patient_name} | Doctor: {doctor_name}

Output ONLY valid JSON (no markdown, no code blocks):
{{
  "overview": "2-3 sentences explaining what {procedure} is and why it is done, in simple language a patient can understand.",
  "steps": [
    {{"title": "Step Name", "description": "Clear explanation of this step in patient-friendly language."}},
    {{"title": "Step Name", "description": "Clear explanation."}},
    {{"title": "Step Name", "description": "Clear explanation."}},
    {{"title": "Step Name", "description": "Clear explanation."}}
  ],
  "risks": [
    {{"title": "Risk Name", "description": "What this risk means for the patient.", "likelihood": "percentage or frequency"}}
  ],
  "alternatives": [
    {{"title": "Alternative Name", "description": "How this alternative works.", "whenRecommended": "When this is better than {procedure}"}}
  ],
  "recovery": {{
    "summary": "2-3 sentences about recovery timeline.",
    "timeline": [
      {{"label": "Time Period", "description": "What to expect during this period."}}
    ]
  }},
  "do": ["Instruction 1", "Instruction 2", "Instruction 3", "Instruction 4"],
  "dont": ["Restriction 1", "Restriction 2", "Restriction 3", "Restriction 4"],
  "quiz": {{
    "questions": [
      {{
        "id": "q1",
        "question": "Comprehension question about the procedure?",
        "correctOption": "A",
        "options": {{"A": "Correct answer", "B": "Wrong answer"}}
      }},
      {{
        "id": "q2",
        "question": "Question about risks or recovery?",
        "correctOption": "A",
        "options": {{"A": "Correct answer", "B": "Wrong answer"}}
      }},
      {{
        "id": "q3",
        "question": "Question about alternatives or instructions?",
        "correctOption": "A",
        "options": {{"A": "Correct answer", "B": "Wrong answer"}}
      }}
    ]
  }}
}}

Requirements:
- All text in simple, clear language for a general patient
- At least 4 steps, 3 risks, 2 alternatives
- Quiz questions test understanding, not medical terminology
- DO NOT include text outside the JSON object"""

REVIEW_PROMPT = """You are a medical content reviewer. Review this consent form for "{procedure}" for accuracy and safety.

Consent content:
{consent_json}

Check for:
1. Medical accuracy — are the steps, risks, and alternatives correct?
2. Completeness — are important risks or alternatives missing?
3. Safety — could any instruction harm the patient?
4. Clarity — is the language simple enough for a general patient?

Return ONLY valid JSON:
{{
  "verified": true/false,
  "accuracy_score": 0-100,
  "issues": ["list of issues found, empty if none"],
  "suggestions": ["list of improvements, empty if none"],
  "safety_flags": ["list of safety concerns, empty if none"],
  "notes": "Brief summary of review"
}}"""


# ═══════════════════════════════════════
# PIPELINE STAGES
# ═══════════════════════════════════════

def stage_1_cache_check(procedure: str, language: str) -> dict | None:
    """Check if we have cached content for this procedure+language."""
    cached = get_cached(procedure, language)
    if cached and cached.get("consent"):
        print(f"📦 Cache HIT for {procedure} ({language})")
        return cached
    print(f"📦 Cache MISS for {procedure} ({language})")
    return None


def stage_2_research(procedure: str) -> dict:
    """Research the procedure from medical sources."""
    return research_procedure(procedure)


def stage_3_write_content(procedure: str, patient_name: str, doctor_name: str, research: dict) -> dict:
    """Generate consent content using LLM."""
    prompt = CONTENT_PROMPT.format(
        procedure=procedure,
        context=research.get("context", ""),
        patient_name=patient_name,
        doctor_name=doctor_name
    )
    return generate_json(prompt, temperature=0.4)


def stage_4_enrich_media(procedure: str) -> dict:
    """Find relevant YouTube videos and images."""
    return enrich_media(procedure)


def stage_5_medical_review(procedure: str, consent: dict) -> dict:
    """Review content for medical accuracy."""
    prompt = REVIEW_PROMPT.format(
        procedure=procedure,
        consent_json=json.dumps(consent, indent=2)
    )
    return generate_json(prompt, temperature=0.3)


# ═══════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════

import json

def run_pipeline(procedure: str, patient_name: str = "Patient", doctor_name: str = "Doctor", language: str = "en") -> dict:
    """Execute the full 6-stage pipeline."""
    start_time = time.time()
    print(f"\n{'='*60}")
    print(f"🏥 CONSENT PIPELINE: {procedure} ({language})")
    print(f"{'='*60}")

    # Stage 1: Cache check
    cached = stage_1_cache_check(procedure, language)
    if cached:
        elapsed = time.time() - start_time
        return {
            "success": True,
            "cached": True,
            "consent": cached["consent"],
            "media": {"videos": cached["videos"], "images": cached["images"]},
            "verified": cached.get("verified", False),
            "processing_time_ms": int(elapsed * 1000)
        }

    # Stage 2: Research
    research = stage_2_research(procedure)

    # Stage 3: Write content
    print(f"✍️ Stage 3: Generating consent content...")
    consent = stage_3_write_content(procedure, patient_name, doctor_name, research)

    # Stage 4: Enrich media
    media = stage_4_enrich_media(procedure)

    # Stage 5: Medical review
    print(f"🔍 Stage 5: Medical review...")
    review = stage_5_medical_review(procedure, consent)
    verified = review.get("verified", False)
    accuracy = review.get("accuracy_score", 0)

    print(f"  📋 Review: verified={verified}, accuracy={accuracy}/100")
    if review.get("issues"):
        print(f"  ⚠️ Issues: {review['issues'][:3]}")

    # Stage 6: Cache
    set_cached(procedure, language, consent, media["videos"], media["images"], verified)

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"✅ Pipeline complete: {elapsed:.1f}s ({'cached' if False else 'generated'})")
    print(f"{'='*60}\n")

    return {
        "success": True,
        "cached": False,
        "consent": consent,
        "media": media,
        "verified": verified,
        "review": review,
        "sources": [s for s in ["PubMed", "Wikipedia", "MedlinePlus"] if research.get(s.lower(), {}).get("found")],
        "processing_time_ms": int(elapsed * 1000)
    }
