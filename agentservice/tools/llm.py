"""
LLM Provider — Groq (primary) → Gemini 3.6 → 3.5 → 3.5-lite → OpenRouter
"""
import os
import json
import time
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

TIMEOUT = 45
RETRY_DELAY = 2


def _call_groq(prompt: str, temperature: float = 0.4) -> str | None:
    if not GROQ_API_KEY:
        return None
    try:
        start = time.time()
        res = requests.post(GROQ_URL, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}"
        }, json={
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": 4096,
        }, timeout=TIMEOUT)
        data = res.json()
        elapsed = time.time() - start
        print(f"  ⚡ Groq: {elapsed:.1f}s")
        if res.status_code == 200 and data.get("choices"):
            return data["choices"][0]["message"]["content"]
        print(f"  ⚠️ Groq error: {data.get('error', {}).get('message', 'unknown')[:100]}")
    except Exception as e:
        print(f"  ⚠️ Groq failed: {e}")
    return None


def _call_gemini(prompt: str, temperature: float = 0.4) -> str | None:
    if not GEMINI_API_KEY:
        return None
    for model in GEMINI_MODELS:
        try:
            start = time.time()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            res = requests.post(url, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": temperature, "maxOutputTokens": 4096}
            }, timeout=TIMEOUT)
            data = res.json()
            elapsed = time.time() - start
            if res.status_code == 200 and data.get("candidates"):
                print(f"  ⚡ Gemini {model}: {elapsed:.1f}s")
                return data["candidates"][0]["content"]["parts"][0]["text"]
            print(f"  ⚠️ Gemini {model}: {data.get('error', {}).get('message', 'unknown')[:80]}")
            time.sleep(1)
        except Exception as e:
            print(f"  ⚠️ Gemini {model} failed: {e}")
    return None


def _call_openrouter(prompt: str, temperature: float = 0.4) -> str | None:
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your key":
        return None
    try:
        start = time.time()
        res = requests.post(OPENROUTER_URL, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "http://localhost:4000",
            "X-Title": "Medical Consent App"
        }, json={
            "model": "google/gemma-3-12b-it",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }, timeout=TIMEOUT)
        data = res.json()
        elapsed = time.time() - start
        print(f"  ⚡ OpenRouter: {elapsed:.1f}s")
        if res.status_code == 200 and data.get("choices"):
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"  ⚠️ OpenRouter failed: {e}")
    return None


def generate(prompt: str, temperature: float = 0.4) -> str:
    """Try providers: Groq → Gemini 3.6 → 3.5 → 3.5-lite → OpenRouter."""
    print(f"🤖 LLM: Trying Groq...")
    result = _call_groq(prompt, temperature)
    if result:
        return result

    print(f"🤖 LLM: Trying Gemini chain...")
    result = _call_gemini(prompt, temperature)
    if result:
        return result

    print(f"🤖 LLM: Trying OpenRouter...")
    result = _call_openrouter(prompt, temperature)
    if result:
        return result

    raise Exception("All LLM providers failed")


def generate_json(prompt: str, temperature: float = 0.4) -> dict:
    """Generate and parse JSON from LLM with robust fallback."""
    import re
    raw = generate(prompt, temperature)

    # Try direct parse
    try:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        s = cleaned.find("{")
        e = cleaned.rfind("}")
        if s != -1 and e != -1:
            cleaned = cleaned[s:e + 1]
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try fixing common issues (trailing commas, missing commas)
    try:
        fixed = re.sub(r',\s*([}\]])', r'\1', cleaned)
        fixed = re.sub(r'"\s*\n\s*"', '",\n"', fixed)
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Last resort: extract key fields
    try:
        overview = re.search(r'"overview"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
        return {
            "overview": overview.group(1) if overview else "",
            "steps": [{"title": "Preparation", "description": "Medical team prepares you."},
                      {"title": "Procedure", "description": "The procedure is performed."},
                      {"title": "Recovery", "description": "You begin recovery."}],
            "risks": [{"title": "Infection", "description": "Risk of infection.", "likelihood": "2-5%"}],
            "alternatives": [{"title": "Consultation", "description": "Discuss with doctor.", "whenRecommended": "Always"}],
            "recovery": {"summary": "Recovery varies.", "timeline": [{"label": "Day 1", "description": "Initial recovery."}]},
            "do": ["Follow instructions"],
            "dont": ["Ignore symptoms"],
            "quiz": {"questions": [{"id": "q1", "question": "Do you understand?", "correctOption": "A", "options": {"A": "Yes", "B": "No"}}]}
        }
    except:
        raise Exception(f"Failed to parse LLM response")
