/**
 * Media Service — YouTube + Images for Vercel
 * Filters for only relevant medical content
 */

const TIMEOUT = 10000;

// ─── YouTube Filtering ──────────────────────────────────
const YOUTUBE_EXCLUDE = ['shorts', 'tiktok', 'meme', 'funny', 'prank', 'vlog', 'reaction', 'review'];
const YOUTUBE_REQUIRED = ['surgery', 'procedure', 'medical', 'explanation', 'how', 'what is', 'animation', '3d'];

function isGoodYouTube(title, desc = '') {
    const text = `${title} ${desc}`.toLowerCase();
    // Exclude shorts and non-educational
    for (const kw of YOUTUBE_EXCLUDE) if (text.includes(kw)) return false;
    // Must have medical/educational keywords
    for (const kw of YOUTUBE_REQUIRED) if (text.includes(kw)) return true;
    return false;
}

export async function searchYouTube(procedure, maxResults = 3) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === 'your_youtube_api_key_here') return [];

    try {
        // Search for educational videos, exclude shorts
        const query = `${procedure} surgery explained animation medical education`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults + 5}&key=${apiKey}&videoDuration=medium&relevanceLanguage=en&safeSearch=strict`;
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
        const data = await res.json();

        const videos = (data.items || [])
            .filter(item => {
                const title = item.snippet?.title || '';
                const desc = item.snippet?.description || '';
                // Exclude shorts (usually have #shorts or very short titles)
                if (title.toLowerCase().includes('#shorts') || title.length < 15) return false;
                return isGoodYouTube(title, desc);
            })
            .slice(0, maxResults)
            .map(item => ({
                title: item.snippet.title,
                description: (item.snippet.description || '').substring(0, 200),
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                embed_url: `https://www.youtube.com/embed/${item.id.videoId}?rel=0`,
                thumbnail: item.snippet.thumbnails?.high?.url || '',
                channel: item.snippet.channelTitle || ''
            }));

        return videos;
    } catch (e) {
        console.warn('YouTube error:', e.message);
        return [];
    }
}

// ─── Image Filtering ──────────────────────────────────
const IMG_EXCLUDE = ['logo', 'icon', 'banner', 'cartoon', 'clipart', 'meme', 'funny', 'toy', 'game', 'stock', 'photo', 'picture', 'selfie', 'portrait'];
const IMG_REQUIRED = ['surgery', 'surgical', 'medical', 'anatomy', 'procedure', 'diagram', 'illustration', 'chart', 'infographic'];

function isMedicalImage(title, desc = '') {
    const text = `${title} ${desc}`.toLowerCase();
    // Exclude non-medical
    for (const kw of IMG_EXCLUDE) if (text.includes(kw)) return false;
    // Must have medical keywords
    for (const kw of IMG_REQUIRED) if (text.includes(kw)) return true;
    return false;
}

export async function searchImages(procedure, maxResults = 4) {
    const images = [];
    const queries = [
        `${procedure} surgery diagram medical`,
        `${procedure} anatomy illustration`,
        `${procedure} medical procedure chart`
    ];

    for (const query of queries) {
        if (images.length >= maxResults) break;
        try {
            const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${maxResults + 2}&license=by,by-sa,cc0`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'MedConsentApp/1.0' },
                signal: AbortSignal.timeout(TIMEOUT)
            });
            const data = await res.json();

            for (const item of (data.results || [])) {
                const title = item.title || '';
                const desc = item.description || '';
                if (isMedicalImage(title, desc)) {
                    images.push({
                        title: title,
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
