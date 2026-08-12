"""
Medical Research Agent — PubMed + Wikipedia + MedlinePlus + Mayo Clinic
All free, no API keys required for light use.
"""
import requests
import json
from concurrent.futures import ThreadPoolExecutor

TIMEOUT = 12
HEADERS = {"User-Agent": "MedConsentApp/1.0 (medical-consent-education)"}


# ═══════════════════════════════════════
# PubMed — Peer-reviewed medical facts
# ═══════════════════════════════════════
def _search_pubmed(procedure: str) -> dict:
    """Search PubMed for procedure details, risks, and recovery info."""
    try:
        # Search for articles
        search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        res = requests.get(search_url, params={
            "db": "pubmed",
            "term": f"{procedure} surgery procedure risks recovery",
            "retmode": "json",
            "retmax": 5,
            "sort": "relevance"
        }, timeout=TIMEOUT)
        data = res.json()
        ids = data.get("esearchresult", {}).get("idlist", [])

        if not ids:
            # Try simpler query
            res = requests.get(search_url, params={
                "db": "pubmed", "term": procedure, "retmode": "json", "retmax": 3
            }, timeout=TIMEOUT)
            ids = res.json().get("esearchresult", {}).get("idlist", [])

        if not ids:
            return {"source": "pubmed", "found": False, "articles": []}

        # Fetch abstracts (not just titles)
        detail_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        res = requests.get(detail_url, params={
            "db": "pubmed",
            "id": ",".join(ids),
            "retmode": "xml",
            "rettype": "abstract"
        }, timeout=TIMEOUT)

        # Parse abstracts from XML
        articles = []
        xml_text = res.text
        for uid in ids:
            # Extract title
            title_start = xml_text.find(f"<ArticleTitle>")
            title_end = xml_text.find("</ArticleTitle>", title_start) if title_start != -1 else -1
            title = xml_text[title_start + 14:title_end].strip() if title_start != -1 and title_end != -1 else ""

            # Extract abstract
            abs_start = xml_text.find("<AbstractText")
            abs_end = xml_text.find("</AbstractText>", abs_start) if abs_start != -1 else -1
            abstract = ""
            if abs_start != -1 and abs_end != -1:
                # Get text content, removing tags
                import re
                raw = xml_text[abs_start:abs_end]
                abstract = re.sub(r'<[^>]+>', '', raw).strip()[:500]

            if title or abstract:
                articles.append({
                    "title": title,
                    "abstract": abstract,
                    "source": "PubMed",
                    "pubmed_id": uid
                })

        return {"source": "pubmed", "found": bool(articles), "articles": articles[:3]}
    except Exception as e:
        print(f"  ⚠️ PubMed error: {e}")
        return {"source": "pubmed", "found": False, "articles": []}


# ═══════════════════════════════════════
# Wikipedia — Patient-friendly overview
# ═══════════════════════════════════════
def _search_wikipedia(procedure: str) -> dict:
    """Search Wikipedia for procedure overview and details."""
    search_terms = [
        procedure,
        f"{procedure} surgery",
        f"{procedure} procedure",
        f"{procedure} (medical)"
    ]

    for name in search_terms:
        try:
            # Try summary endpoint first
            url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{name.replace(' ', '_')}"
            res = requests.get(url, timeout=TIMEOUT, headers=HEADERS)
            if res.status_code == 200:
                data = res.json()
                extract = data.get("extract", "")

                # Also try to get full article for more details
                full_url = f"https://en.wikipedia.org/api/rest_v1/page/html/{name.replace(' ', '_')}"
                try:
                    full_res = requests.get(full_url, timeout=TIMEOUT, headers=HEADERS)
                    if full_res.status_code == 200:
                        import re
                        # Extract text from HTML, remove tags
                        html = full_res.text
                        # Get sections about risks, complications, recovery
                        sections = re.findall(r'<h2[^>]*>.*?</h2>.*?(?=<h2|$)', html, re.DOTALL)
                        section_text = " ".join([re.sub(r'<[^>]+>', '', s)[:300] for s in sections[:5]])
                        if section_text:
                            extract += "\n\nAdditional details: " + section_text[:1000]
                except:
                    pass

                return {
                    "source": "wikipedia",
                    "found": True,
                    "title": data.get("title", ""),
                    "extract": extract[:2000],
                    "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                    "thumbnail": data.get("thumbnail", {}).get("source", "")
                }
        except:
            continue

    return {"source": "wikipedia", "found": False}


# ═══════════════════════════════════════
# MedlinePlus — NIH patient-friendly info
# ═══════════════════════════════════════
def _search_medlineplus(procedure: str) -> dict:
    """Search MedlinePlus for patient-friendly medical information."""
    try:
        # Try the MedlinePlus Connect API
        search_url = "https://connect.medlineplus.gov/service"
        res = requests.get(search_url, params={
            "topic": procedure.replace(" ", "+"),
            "json": "true"
        }, timeout=TIMEOUT)

        if res.status_code == 200:
            try:
                data = res.json()
                if data:
                    return {
                        "source": "medlineplus",
                        "found": True,
                        "url": f"https://medlineplus.gov/searchresults.html?query={procedure.replace(' ', '+')}",
                        "data": data
                    }
            except:
                pass

        # Fallback: just return the search URL
        return {
            "source": "medlineplus",
            "found": True,
            "url": f"https://medlineplus.gov/searchresults.html?query={procedure.replace(' ', '+')}"
        }
    except:
        return {"source": "medlineplus", "found": False}


# ═══════════════════════════════════════
# Mayo Clinic — Trusted medical info
# ═══════════════════════════════════════
def _search_mayoclinic(procedure: str) -> dict:
    """Search Mayo Clinic for procedure information."""
    try:
        # Mayo Clinic search
        search_url = "https://www.mayoclinic.org/search/search-results"
        res = requests.get(search_url, params={
            "q": procedure,
            "profile": "mayoclinic"
        }, timeout=TIMEOUT, headers=HEADERS)

        if res.status_code == 200:
            return {
                "source": "mayoclinic",
                "found": True,
                "url": f"https://www.mayoclinic.org/search/search-results?q={procedure.replace(' ', '+')}"
            }
    except:
        pass
    return {"source": "mayoclinic", "found": False}


# ═══════════════════════════════════════
# MAIN RESEARCH FUNCTION
# ═══════════════════════════════════════
def research_procedure(procedure: str) -> dict:
    """
    Research a medical procedure from multiple authoritative sources.
    Returns structured context for LLM content generation.
    """
    print(f"📚 Researching: {procedure}")

    # Run all searches in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        pubmed_future = executor.submit(_search_pubmed, procedure)
        wiki_future = executor.submit(_search_wikipedia, procedure)
        medline_future = executor.submit(_search_medlineplus, procedure)
        mayo_future = executor.submit(_search_mayoclinic, procedure)

        pubmed = pubmed_future.result()
        wiki = wiki_future.result()
        medline = medline_future.result()
        mayo = mayo_future.result()

    # Build rich context for LLM
    context_parts = []
    source_list = []

    # Wikipedia — most detailed, patient-friendly
    if wiki.get("found"):
        extract = wiki.get("extract", "")
        context_parts.append(f"=== Wikipedia: {wiki.get('title', '')} ===\n{extract}")
        source_list.append("Wikipedia")

    # PubMed — peer-reviewed facts
    if pubmed.get("found"):
        for art in pubmed.get("articles", [])[:2]:
            title = art.get("title", "")
            abstract = art.get("abstract", "")
            if title:
                context_parts.append(f"=== PubMed: {title} ===\n{abstract or 'Abstract not available'}")
        source_list.append("PubMed")

    # MedlinePlus — NIH patient info
    if medline.get("found"):
        context_parts.append(f"=== MedlinePlus ===\nNIH patient-friendly information available at: {medline.get('url', '')}")
        source_list.append("MedlinePlus")

    # Mayo Clinic — trusted reference
    if mayo.get("found"):
        context_parts.append(f"=== Mayo Clinic ===\nTrusted medical reference at: {mayo.get('url', '')}")
        source_list.append("Mayo Clinic")

    context = "\n\n".join(context_parts) if context_parts else f"General medical knowledge about {procedure}. This is a surgical procedure that should be explained in simple patient-friendly language."

    print(f"  ✅ Research: {len(source_list)} sources ({', '.join(source_list)})")

    return {
        "procedure": procedure,
        "pubmed": pubmed,
        "wikipedia": wiki,
        "medlineplus": medline,
        "mayoclinic": mayo,
        "context": context,
        "sources": source_list
    }
