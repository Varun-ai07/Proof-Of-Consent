/**
 * Translation Service — Translates consent content using Google Translate
 * Uses the `translate` npm package (free Google Translate scraping)
 */
import translate from 'translate';

// Language code mapping for Google Translate
const LANG_MAP = {
    'en': 'en',
    'hi': 'hi',
    'ta': 'ta',
    'te': 'te',
    'bn': 'bn',
    'mr': 'mr',
    'kn': 'kn',
    'ml': 'ml'
};

/**
 * Translate a single text string
 */
export async function translateText(text, targetLang) {
    if (!text || targetLang === 'en') return text;

    try {
        const result = await translate(text, { to: LANG_MAP[targetLang] || targetLang });
        return result;
    } catch (err) {
        console.error(`Translation to ${targetLang} failed:`, err.message);
        return text; // Return original on failure
    }
}

/**
 * Translate an entire consent content object
 */
export async function translateConsentContent(content, targetLang) {
    if (targetLang === 'en' || !content) return content;

    console.log(`🌐 Translating content to ${targetLang}...`);
    const startTime = Date.now();

    try {
        // Translate overview
        const overview = content.overview ? await translateText(content.overview, targetLang) : content.overview;

        // Translate aiSummary if present
        const aiSummary = content.aiSummary ? await translateText(content.aiSummary, targetLang) : content.aiSummary;

        // Translate steps
        const steps = await Promise.all((content.steps || []).map(async (step) => ({
            title: await translateText(step.title, targetLang),
            description: await translateText(step.description, targetLang)
        })));

        // Translate risks
        const risks = await Promise.all((content.risks || []).map(async (risk) => ({
            title: await translateText(risk.title, targetLang),
            description: await translateText(risk.description, targetLang),
            likelihood: await translateText(risk.likelihood, targetLang)
        })));

        // Translate alternatives
        const alternatives = await Promise.all((content.alternatives || []).map(async (alt) => ({
            title: await translateText(alt.title, targetLang),
            description: await translateText(alt.description, targetLang),
            whenRecommended: await translateText(alt.whenRecommended, targetLang)
        })));

        // Translate recovery
        const recoverySummary = content.recovery?.summary ? await translateText(content.recovery.summary, targetLang) : content.recovery?.summary;

        // Translate recovery timeline
        const timeline = await Promise.all((content.recovery?.timeline || []).map(async (item) => ({
            label: await translateText(item.label, targetLang),
            description: await translateText(item.description, targetLang)
        })));

        // Translate do items
        const doItems = await Promise.all((content.recovery?.do || []).map(item => translateText(item, targetLang)));

        // Translate don't items
        const dontItems = await Promise.all((content.recovery?.dont || []).map(item => translateText(item, targetLang)));

        // Translate quiz questions
        const quizQuestions = await Promise.all((content.quiz?.questions || []).map(async (q) => ({
            ...q,
            question: await translateText(q.question, targetLang),
            options: {
                A: await translateText(q.options.A, targetLang),
                B: await translateText(q.options.B, targetLang)
            }
        })));

        const translatedContent = {
            ...content,
            overview,
            aiSummary,
            steps,
            risks,
            alternatives,
            recovery: {
                ...content.recovery,
                summary: recoverySummary,
                timeline,
                do: doItems,
                dont: dontItems
            },
            quiz: {
                questions: quizQuestions
            }
        };

        const elapsed = Date.now() - startTime;
        console.log(`✅ Translation complete in ${elapsed}ms`);

        return translatedContent;

    } catch (err) {
        console.error('Translation failed:', err.message);
        return content; // Return original on failure
    }
}
