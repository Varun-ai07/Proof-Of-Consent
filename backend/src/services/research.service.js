/**
 * Research Agent — PubMed + Wikipedia + MedlinePlus
 * Standalone implementation for Vercel (no Python dependency)
 */

const TIMEOUT = 12000;
const HEADERS = { 'User-Agent': 'MedConsentApp/1.0 (medical-consent-education)' };

async function searchPubMed(procedure) {
    try {
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(procedure + ' surgery procedure risks recovery')}&retmode=json&retmax=5&sort=relevance`;
        const res = await fetch(searchUrl, { signal: AbortSignal.timeout(TIMEOUT) });
        const data = await res.json();
        const ids = data.esearchresult?.idlist || [];

        if (ids.length === 0) return { source: 'pubmed', found: false };

        const detailUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml&rettype=abstract`;
        const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(TIMEOUT) });
        const xmlText = await detailRes.text();

        const articles = [];
        for (const uid of ids.slice(0, 3)) {
            const titleMatch = xmlText.match(new RegExp(`<PubmedArticle[^>]*>.*?<ArticleTitle>(.*?)</ArticleTitle>`, 's'));
            const absMatch = xmlText.match(new RegExp(`<AbstractText[^>]*>(.*?)</AbstractText>`, 's'));
            if (titleMatch) articles.push({ title: titleMatch[1].replace(/<[^>]+>/g, ''), abstract: absMatch ? absMatch[1].replace(/<[^>]+>/g, '').substring(0, 500) : '' });
        }
        return { source: 'pubmed', found: articles.length > 0, articles };
    } catch (e) {
        console.warn('PubMed error:', e.message);
        return { source: 'pubmed', found: false };
    }
}

async function searchWikipedia(procedure) {
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(procedure)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: HEADERS });
        const data = await res.json();
        if (data.extract) {
            return { source: 'wikipedia', found: true, title: data.title, extract: data.extract.substring(0, 1000) };
        }
        // Try with "surgery" suffix
        const res2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(procedure + ' surgery')}`, { signal: AbortSignal.timeout(TIMEOUT), headers: HEADERS });
        const data2 = await res2.json();
        if (data2.extract) {
            return { source: 'wikipedia', found: true, title: data2.title, extract: data2.extract.substring(0, 1000) };
        }
        return { source: 'wikipedia', found: false };
    } catch (e) {
        console.warn('Wikipedia error:', e.message);
        return { source: 'wikipedia', found: false };
    }
}

async function searchMedlinePlus(procedure) {
    try {
        const url = `https://wsearch.nlm.nih.gov/v1/rest-api/retcode=0&db=healthTopics&term=${encodeURIComponent(procedure)}&offset=0&limit=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: HEADERS });
        const data = await res.json();
        const resourceList = data.resourceList?.resource || [];
        if (resourceList.length > 0) {
            return { source: 'medlineplus', found: true, url: resourceList[0].url || '' };
        }
        return { source: 'medlineplus', found: false };
    } catch (e) {
        console.warn('MedlinePlus error:', e.message);
        return { source: 'medlineplus', found: false };
    }
}

export async function researchProcedure(procedure) {
    console.log(`📚 Researching: ${procedure}`);
    const [pubmed, wiki, medline] = await Promise.all([
        searchPubMed(procedure),
        searchWikipedia(procedure),
        searchMedlinePlus(procedure)
    ]);

    const contextParts = [];
    const sources = [];

    if (wiki.found) {
        contextParts.push(`=== Wikipedia: ${wiki.title} ===\n${wiki.extract}`);
        sources.push('Wikipedia');
    }
    if (pubmed.found) {
        for (const art of (pubmed.articles || []).slice(0, 2)) {
            contextParts.push(`=== PubMed: ${art.title} ===\n${art.abstract || 'Abstract not available'}`);
        }
        sources.push('PubMed');
    }
    if (medline.found) {
        contextParts.push(`=== MedlinePlus ===\nNIH patient-friendly information available at: ${medline.url}`);
        sources.push('MedlinePlus');
    }

    const context = contextParts.length > 0
        ? contextParts.join('\n\n')
        : `General medical knowledge about ${procedure}. This is a surgical procedure that should be explained in simple patient-friendly language.`;

    console.log(`  ✅ Research: ${sources.length} sources (${sources.join(', ') || 'fallback'})`);

    return { procedure, pubmed, wikipedia: wiki, medlineplus: medline, context, sources };
}
