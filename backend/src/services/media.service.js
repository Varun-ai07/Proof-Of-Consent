/**
 * Media Service — Direct YouTube + image search for Vercel
 * Standalone implementation that doesn't depend on agent service
 */

const TIMEOUT = 10000;

// Medical keywords to filter relevant images
const MEDICAL_KEYWORDS = ['surgery', 'surgical', 'medical', 'anatomy', 'procedure', 'hospital', 'doctor', 'diagram', 'illustration'];
const EXCLUDE_KEYWORDS = ['logo', 'icon', 'banner', 'cartoon', 'clipart', 'meme', 'funny', 'toy', 'game'];

function isRelevant(title, desc = '') {
    const text = `${title} ${desc}`.toLowerCase();
    for (const kw of EXCLUDE_KEYWORDS) if (text.includes(kw)) return false;
    for (const kw of MEDICAL_KEYWORDS) if (text.includes(kw)) return true;
    return false;
}

export async function searchYouTube(procedure, maxResults = 3) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === 'your_youtube_api_key_here') return [];

    try {
        const query = `${procedure} surgery medical explanation patient education`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults + 2}&key=${apiKey}&videoDuration=short&relevanceLanguage=en`;
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
        const data = await res.json();

        return (data.items || [])
            .filter(item => isRelevant(item.snippet?.title, item.snippet?.description))
            .slice(0, maxResults)
            .map(item => ({
                title: item.snippet.title,
                description: (item.snippet.description || '').substring(0, 200),
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                embed_url: `https://www.youtube.com/embed/${item.id.videoId}`,
                thumbnail: item.snippet.thumbnails?.high?.url || '',
                channel: item.snippet.channelTitle || ''
            }));
    } catch (e) {
        console.warn('YouTube error:', e.message);
        return [];
    }
}

export async function searchImages(procedure, maxResults = 4) {
    const images = [];
    const queries = [`${procedure} surgery medical`, `${procedure} anatomy diagram`, `${procedure} medical illustration`];

    for (const query of queries) {
        if (images.length >= maxResults) break;
        try {
            const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${maxResults}&license=by,by-sa,cc0`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'MedConsentApp/1.0' },
                signal: AbortSignal.timeout(TIMEOUT)
            });
            const data = await res.json();
            for (const item of (data.results || [])) {
                if (isRelevant(item.title, item.description)) {
                    images.push({
                        title: item.title || '',
                        url: item.url || '',
                        thumbnail: item.thumbnail || '',
                        creator: item.creator || '',
                        license: item.license || '',
                        source: 'Openverse'
                    });
                }
                if (images.length >= maxResults) break;
            }
        } catch (e) {
            console.warn('Openverse error:', e.message);
        }
    }
    return images.slice(0, maxResults);
}

export async function enrichMedia(procedure) {
    console.log(`🎨 Enriching media: ${procedure}`);
    const [videos, images] = await Promise.all([
        searchYouTube(procedure, 3),
        searchImages(procedure, 4)
    ]);
    console.log(`  ✅ Media: ${videos.length} videos, ${images.length} images`);
    return { videos, images };
}
