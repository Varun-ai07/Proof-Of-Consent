import 'dotenv/config'; // Load .env file
import { generatePatientConsentContent } from './services/ai.service.js';

async function test() {
    console.log('Testing AI generation...');
    console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
    if (process.env.OPENROUTER_API_KEY) {
        console.log('API Key length:', process.env.OPENROUTER_API_KEY.length);
        console.log('API Key starts with:', process.env.OPENROUTER_API_KEY.substring(0, 5));
    } else {
        console.error('API Key MISSING!');
    }

    try {
        const result = await generatePatientConsentContent({
            procedure: 'Appendectomy',
            patientName: 'Test Patient',
            doctorName: 'Dr. Test'
        });
        console.log('Result:', JSON.stringify(result, null, 2));

        // Check if result is fallback content?
        if (result.steps && result.steps.length > 0 && result.steps[0].title === 'Anesthesia' && result.steps[0].description.includes('comfortable and pain-free')) {
            console.warn('WARNING: Result looks like fallback content!');
        } else {
            console.log('SUCCESS: Result does NOT look like fallback content!');
        }

    } catch (err) {
        console.error('Test failed with error:', err);
    }
}

test();
