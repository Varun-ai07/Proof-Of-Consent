"""
Consent Generation Pipeline — 6 stages (with hallucination control)
1. Cache check
2. Research (no LLM) — with hard-stop if no sources found
3. Write content (1 LLM call) — with citation enforcement
4. Enrich media (no LLM)
5. Medical review + fact-checking against research
6. Cache + return
"""
import json
import time
from tools.llm import generate_json, generate
from tools.research import research_procedure
from tools.media import enrich_media
from tools.cache import get_cached, set_cached
from tools.verified_procedures import get_verified_procedure


# ═══════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════

CONTENT_PROMPT = """You are a medical consent form expert. Generate a patient-friendly consent form for "{procedure}".

Research context (use ONLY these facts — do NOT invent information):
{context}

Patient: {patient_name} | Doctor: {doctor_name}

CRITICAL RULES:
1. ONLY use facts found in the research context above
2. If a fact is NOT in the research context, mark it as "unverified" in a notes field
3. Do NOT make up statistics, percentages, or risk likelihoods — only use what's in the research
4. Do NOT invent medical procedures or treatments not mentioned in the research
5. If the research context is insufficient, generate minimal content and flag it

Output ONLY valid JSON (no markdown, no code blocks):
{{
  "overview": "2-3 sentences explaining what {procedure} is and why it is done, based ONLY on research context.",
  "steps": [
    {{"title": "Step Name", "description": "Clear explanation from research.", "source": "research_source_name"}}
  ],
  "risks": [
    {{"title": "Risk Name", "description": "What this risk means for the patient.", "likelihood": "percentage from research ONLY", "source": "research_source_name"}}
  ],
  "alternatives": [
    {{"title": "Alternative Name", "description": "How this alternative works.", "whenRecommended": "When this is better than {procedure}", "source": "research_source_name"}}
  ],
  "recovery": {{
    "summary": "2-3 sentences about recovery timeline from research.",
    "timeline": [
      {{"label": "Time Period", "description": "What to expect during this period.", "source": "research_source_name"}}
    ],
    "do": ["Instruction 1", "Instruction 2", "Instruction 3", "Instruction 4"],
    "dont": ["Restriction 1", "Restriction 2", "Restriction 3", "Restriction 4"]
  }},
  "quiz": {{
    "questions": [
      {{
        "id": "q1",
        "question": "Comprehension question based on the content above?",
        "correctOption": "A",
        "options": {{"A": "Correct answer from content", "B": "Plausible wrong answer"}}
      }}
    ]
  }},
  "sources_used": ["list of research sources used"],
  "unverified_claims": ["list any claims not directly from research, or empty array if all verified"],
  "confidence": "high|medium|low — based on how much research was available"
}}

Requirements:
- At least 4 steps, 3 risks, 2 alternatives
- Every claim MUST cite its source
- Quiz questions must come from the content above, not invented
- DO NOT include text outside the JSON object"""

REVIEW_PROMPT = """You are a medical content reviewer. Review this consent form for "{procedure}" for accuracy and safety.

Consent content:
{consent_json}

Research context used for generation:
{research_context}

Check for:
1. Medical accuracy — are the steps, risks, and alternatives correct?
2. Completeness — are important risks or alternatives missing?
3. Safety — could any instruction harm the patient?
4. Clarity — is the language simple enough for a general patient?
5. SOURCE VERIFICATION — does each claim match the research context?
6. HALLUCINATION CHECK — are there any claims NOT supported by the research?

Return ONLY valid JSON:
{{
  "verified": true/false,
  "accuracy_score": 0-100,
  "issues": ["list of issues found, empty if none"],
  "hallucinated_claims": ["list any claims not found in research context"],
  "source_mismatches": ["list claims where source citation doesn't match content"],
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
    """Research the procedure from medical sources with hard-stop on failure."""
    research = research_procedure(procedure)

    # Hard-stop: if no authoritative sources found, don't generate content
    sources = research.get("sources", [])
    if not sources:
        raise ValueError(
            f"No authoritative medical sources found for '{procedure}'. "
            f"Cannot generate safe consent content without verified information. "
            f"Please try a more specific procedure name (e.g., 'laparoscopic appendectomy' instead of 'appendectomy')."
        )

    print(f"  ✅ Research: {len(sources)} sources ({', '.join(sources)})")
    return research


def stage_3_write_content(procedure: str, patient_name: str, doctor_name: str, research: dict) -> dict:
    """Generate consent content using LLM with citation enforcement."""
    prompt = CONTENT_PROMPT.format(
        procedure=procedure,
        context=research.get("context", ""),
        patient_name=patient_name,
        doctor_name=doctor_name
    )
    content = generate_json(prompt, temperature=0.4)

    # Fix: AI often puts do/dont at top level instead of inside recovery
    if content.get('do') and not content.get('recovery', {}).get('do'):
        content.setdefault('recovery', {})['do'] = content.pop('do')
    if content.get('dont') and not content.get('recovery', {}).get('dont'):
        content.setdefault('recovery', {})['dont'] = content.pop('dont')

    return content


def stage_4_enrich_media(procedure: str) -> dict:
    """Find relevant YouTube videos and images."""
    return enrich_media(procedure)


def stage_5_medical_review(procedure: str, consent: dict, research: dict) -> dict:
    """Review content for medical accuracy with hallucination detection."""
    prompt = REVIEW_PROMPT.format(
        procedure=procedure,
        consent_json=json.dumps(consent, indent=2),
        research_context=research.get("context", "No research context available")
    )
    return generate_json(prompt, temperature=0.3)


def stage_6_verify_against_sources(consent: dict, research: dict) -> dict:
    """
    Post-generation verification: cross-check every claim against research.
    Returns verification report with flagged hallucinations.
    """
    research_text = research.get("context", "").lower()
    verification = {"verified_claims": [], "flagged_claims": [], "confidence": "high"}

    # Check overview
    overview = consent.get("overview", "")
    if overview and len(overview) > 20:
        # Simple keyword overlap check
        overview_words = set(overview.lower().split())
        research_words = set(research_text.split())
        overlap = len(overview_words & research_words) / max(len(overview_words), 1)
        if overlap > 0.15:
            verification["verified_claims"].append("overview")
        else:
            verification["flagged_claims"].append("overview — low overlap with research")
            verification["confidence"] = "low"

    # Check risks
    for risk in consent.get("risks", []):
        risk_title = risk.get("title", "").lower()
        if any(word in research_text for word in risk_title.split() if len(word) > 3):
            verification["verified_claims"].append(f"risk: {risk.get('title')}")
        else:
            verification["flagged_claims"].append(f"risk: {risk.get('title')} — not found in research")
            verification["confidence"] = "low"

    # Check steps
    for step in consent.get("steps", []):
        step_title = step.get("title", "").lower()
        if any(word in research_text for word in step_title.split() if len(word) > 3):
            verification["verified_claims"].append(f"step: {step.get('title')}")
        else:
            verification["flagged_claims"].append(f"step: {step.get('title')} — not found in research")
            if verification["confidence"] == "high":
                verification["confidence"] = "medium"

    # Check alternatives
    for alt in consent.get("alternatives", []):
        alt_title = alt.get("title", "").lower()
        if any(word in research_text for word in alt_title.split() if len(word) > 3):
            verification["verified_claims"].append(f"alternative: {alt.get('title')}")
        else:
            verification["flagged_claims"].append(f"alternative: {alt.get('title')} — not found in research")
            if verification["confidence"] == "high":
                verification["confidence"] = "medium"

    print(f"  🔎 Verification: {len(verification['verified_claims'])} verified, {len(verification['flagged_claims'])} flagged")
    return verification


# ═══════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════

def run_pipeline(procedure: str, patient_name: str = "Patient", doctor_name: str = "Doctor", language: str = "en") -> dict:
    """Execute the full 6-stage pipeline with hallucination control."""
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

    # Pre-check: Is this a verified procedure?
    verified_proc = get_verified_procedure(procedure)
    if verified_proc:
        print(f"  ✅ Found in verified database: {verified_proc['name']}")

    # Stage 2: Research (hard-stop if no sources)
    try:
        research = stage_2_research(procedure)
    except ValueError as e:
        print(f"  ❌ Research failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": "research_failed"
        }

    # Stage 3: Write content
    print(f"✍️ Stage 3: Generating consent content...")
    consent = stage_3_write_content(procedure, patient_name, doctor_name, research)

    # Stage 4: Enrich media
    media = stage_4_enrich_media(procedure)

    # Stage 5: Medical review + hallucination check
    print(f"🔍 Stage 5: Medical review + fact-checking...")
    review = stage_5_medical_review(procedure, consent, research)
    verified = review.get("verified", False)
    accuracy = review.get("accuracy_score", 0)

    # Stage 6: Cross-verify against sources
    print(f"🔎 Stage 6: Source verification...")
    source_verification = stage_6_verify_against_sources(consent, research)

    # Merge verification into consent
    consent["verification"] = {
        "source_confidence": source_verification.get("confidence", "unknown"),
        "verified_claims": len(source_verification.get("verified_claims", [])),
        "flagged_claims": len(source_verification.get("flagged_claims", [])),
        "hallucinated": review.get("hallucinated_claims", []),
        "source_mismatches": review.get("source_mismatches", [])
    }

    # If high hallucination rate, mark as unverified
    if len(source_verification.get("flagged_claims", [])) > 2:
        verified = False
        print(f"  ⚠️ Multiple claims flagged — marking as unverified")

    # Merge verified database data if available
    if verified_proc:
        consent["verified_procedure"] = verified_proc.get("name")
        consent["verified_sources"] = verified_proc.get("sources", [])

    print(f"  📋 Review: verified={verified}, accuracy={accuracy}/100")
    print(f"  🔎 Source check: {source_verification.get('confidence', 'unknown')} confidence")
    if review.get("issues"):
        print(f"  ⚠️ Issues: {review['issues'][:3]}")
    if review.get("hallucinated_claims"):
        print(f"  🚨 Hallucinations detected: {review['hallucinated_claims'][:3]}")

    # Stage 7: Cache
    set_cached(procedure, language, consent, media["videos"], media["images"], verified)

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"✅ Pipeline complete: {elapsed:.1f}s")
    print(f"   Confidence: {source_verification.get('confidence', 'unknown')}")
    print(f"   Verified claims: {len(source_verification.get('verified_claims', []))}")
    print(f"   Flagged claims: {len(source_verification.get('flagged_claims', []))}")
    print(f"{'='*60}\n")

    return {
        "success": True,
        "cached": False,
        "consent": consent,
        "media": media,
        "verified": verified,
        "review": review,
        "source_verification": source_verification,
        "sources": [s for s in ["PubMed", "Wikipedia", "MedlinePlus", "Mayo Clinic"] if research.get(s.lower(), {}).get("found")],
        "processing_time_ms": int(elapsed * 1000)
    }
