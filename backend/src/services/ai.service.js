import fetch from 'node-fetch';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-3-12b-it:free';
const TEMPERATURE = 0.7;
const TOP_P = 0.9;

/**
 * Simple legacy explanation (kept for backward compatibility).
 */
export async function generateConsentExplanation(procedure) {
  if (!procedure || typeof procedure !== 'string') {
    throw new Error('Invalid procedure name');
  }

  const prompt = `
You are a medical consent explanation assistant.

Rules:
- Do NOT give medical advice
- Do NOT suggest alternatives
- Do NOT diagnose
- Use simple language
- Explain for a general adult patient
- Be neutral and factual
- Short paragraphs

Explain the medical procedure "${procedure}" including:
1) What the procedure is
2) Why it is done
3) Common risks (high-level)
4) Recovery overview

Keep it under 300 words.
`;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: TEMPERATURE,
    top_p: TOP_P,
  };

  const data = await callOpenRouter(payload);
  return data.choices[0].message.content;
}

/**
 * Patient-friendly structured content aligned with patient.html sections.
 * Makes ONE comprehensive AI call to avoid rate limits.
 * Always returns valid content (AI or fallback).
 */
export async function generatePatientConsentContent({
  procedure,
  patientName = 'Patient',
  doctorName = 'Your Doctor',
  language = 'en',
}) {
  if (!procedure || typeof procedure !== 'string') {
    console.warn('❌ Invalid procedure name, using fallback');
    return buildFallbackContent(procedure || 'Medical Procedure', patientName, doctorName);
  }

  console.log(`🤖 Generating AI content for: ${procedure} (language: ${language})`);

  // Fetch research context for better content
  let researchContext = '';
  try {
    const { researchProcedure } = await import('./research.service.js');
    const research = await researchProcedure(procedure);
    researchContext = research.context || '';
  } catch (e) {
    console.warn('Research failed, using fallback:', e.message);
  }

  const langName = { en:'English', hi:'Hindi', ta:'Tamil', te:'Telugu', bn:'Bengali', mr:'Marathi', kn:'Kannada', ml:'Malayalam' }[language] || 'English';
  const langInstruction = language !== 'en' ? `\n\n*** LANGUAGE REQUIREMENT: You MUST write ALL text content in ${langName} language. This means: overview, step titles, step descriptions, risk titles, risk descriptions, alternative titles, alternative descriptions, recovery summary, do items, dont items, quiz questions, and quiz options — ALL in ${langName}. The ONLY English allowed is the JSON field names (keys like "overview", "steps", "risks" etc). If you write any content value in English, the output is WRONG. ***` : '';

  const prompt = `You are an expert medical consent assistant. Create a detailed consent form for "${procedure}" for a patient named "${patientName}".
  ${langInstruction}
  
  Research context (use ONLY these facts — do NOT invent information):
  ${researchContext || 'General medical knowledge about ' + procedure}
  
  Output MUST be valid JSON only, without markdown formatting or code blocks. The JSON must match this structure:
  {
    "overview": "2-3 sentences explaining the procedure effectively and why it is done.",
    "steps": [
      {"title": "Step Title", "description": "Detailed explanation of this step."}
    ],
    "risks": [
      {"title": "Risk Title", "description": "Explanation of risk.", "likelihood": "Percentage (e.g. 1-2%)"}
    ],
    "alternatives": [
      {"title": "Alternative Title", "description": "Description of alternative.", "whenRecommended": "When this is recommended over the procedure."}
    ],
    "recovery": {
      "summary": "2-3 sentences about recovery timeline.",
      "timeline": [
        {"label": "Day 1-2", "description": "Initial recovery steps."},
        {"label": "Week 1", "description": "What to expect in the first week."}
      ]
    },
    "do": ["Post-op instruction 1", "Post-op instruction 2"],
    "dont": ["Post-op restriction 1", "Post-op restriction 2"],
    "quiz": {
      "questions": [
        {
          "id": "q1",
          "question": "Question text?",
          "correctOption": "A",
          "options": {"A": "Correct Answer", "B": "Wrong Answer"}
        }
      ]
    }
  }
  
  Requirements:
  1. "steps": Include at least 4 detailed steps (Preparation, Anesthesia, Procedure details, Closure).
  2. "risks": Include at least 4 specific risks with likelihoods.
  3. "alternatives": Include at least 2 common alternatives (e.g. medical management, different surgical approach).
  4. "do" and "dont": Include at least 4 items each specific to this procedure.
  5. "quiz": Include 3-4 multiple choice questions to test understanding.
  6. Use simple, clear language suitable for a general patient.
  7. DO NOT include any text outside the JSON object.
  `;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: TEMPERATURE,
    top_p: TOP_P,
  };

  try {
    console.log('📡 Calling OpenRouter API...');
    const data = await callOpenRouter(payload);
    const content = data.choices?.[0]?.message?.content || '';

    console.log('📥 AI Response received, length:', content.length);

    if (!content || content.length < 50) {
      console.warn('⚠️ AI response too short, using fallback');
      return buildFallbackContent(procedure, patientName, doctorName);
    }

    // Parse the response
    let parsed;
    try {
      // Clean up potential markdown code blocks if the model adds them
      const jsonStr = content.replace(/```json\n?|```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.log('Raw output:', content);
      // Try to fallback to the old parser in case it returned text? 
      // Or just fail to fallback content.
      return buildFallbackContent(procedure, patientName, doctorName);
    }

    console.log('✅ Parsed content successfully');

    return {
      overview: parsed.overview || `${procedure} is a surgical procedure performed to treat your condition.`,
      steps: Array.isArray(parsed.steps) && parsed.steps.length > 0 ? parsed.steps : buildFallbackContent(procedure).steps,
      risks: Array.isArray(parsed.risks) && parsed.risks.length > 0 ? parsed.risks : buildFallbackContent(procedure).risks,
      alternatives: Array.isArray(parsed.alternatives) && parsed.alternatives.length > 0 ? parsed.alternatives : [
        {
          title: 'Medical Management',
          description: 'Medication-based treatment without surgery.',
          whenRecommended: 'When surgery can be safely deferred'
        }
      ],
      recovery: {
        summary: parsed.recovery?.summary || (typeof parsed.recovery === 'string' ? parsed.recovery : `Recovery from ${procedure} typically takes 4-6 weeks with proper care.`),
        timeline: (parsed.recovery?.timeline && Array.isArray(parsed.recovery.timeline)) ? parsed.recovery.timeline : [
          { label: 'Day 1', description: 'Hospital recovery with monitoring and pain management.' },
          { label: 'Day 2-3', description: 'Begin light walking. May be discharged home.' },
          { label: 'Week 1-2', description: 'Rest at home. Light activities only. Follow-up appointment.' },
          { label: 'Week 4-6', description: 'Gradual return to normal activities as approved by doctor.' },
        ],
        do: Array.isArray(parsed.do) ? parsed.do : [
          'Take all prescribed medications on schedule',
          'Walk short distances daily to prevent blood clots',
          'Keep surgical site clean and dry',
          'Attend all follow-up appointments',
          'Get plenty of rest and sleep'
        ],
        dont: Array.isArray(parsed.dont) ? parsed.dont : [
          'Lift anything heavier than 10 pounds',
          'Drive until cleared by your doctor',
          'Submerge incision in water (baths, pools)',
          'Skip doses of prescribed medications',
          'Ignore signs of infection (fever, redness, discharge)'
        ],
      },
      quiz: (parsed.quiz && Array.isArray(parsed.quiz.questions)) ? parsed.quiz : buildQuizForProcedure(procedure),
      metadata: { procedure, patientName, doctorName },
      plainTextSummary: parsed.overview,
    };
  } catch (err) {
    console.error('❌ AI generation failed:', err.message);
    console.error('Stack:', err.stack);
    return buildFallbackContent(procedure, patientName, doctorName);
  }
}

/**
 * Enhanced parser not needed when using JSON mode, 
 * but keeping a dummy or removing it.
 * We removed the usage above, so we can remove this function or keep it empty.
 * I will remove it provided the range covers it.
 */
function parseEnhancedResponse(content, procedure) {
  // Legacy parser not used anymore
  return {};
}

/**
 * Build quiz questions for a procedure
 */
function buildQuizForProcedure(procedure) {
  return {
    questions: [
      {
        id: 'q1',
        question: `Will you be awake during the ${procedure}?`,
        correctOption: 'A',
        options: {
          A: 'No, you will be under anesthesia',
          B: 'Yes, you will be fully awake',
        },
      },
      {
        id: 'q2',
        question: 'What is a common risk of this procedure?',
        correctOption: 'A',
        options: {
          A: 'Minor infection at incision site',
          B: 'Catching a common cold',
        },
      },
      {
        id: 'q3',
        question: 'How long is typical recovery?',
        correctOption: 'A',
        options: {
          A: 'About 1-2 weeks',
          B: 'About 3-4 months',
        },
      },
      {
        id: 'q4',
        question: 'In your own words, what did you understand about this procedure?',
        minWords: 20,
      },
    ],
  };
}

/**
 * AI Chat - answer patient questions about their procedure
 * Detects the language of the question and responds in the same language
 */
export async function answerPatientQuestion({ question, procedure, patientContext }) {
  if (!question || typeof question !== 'string') {
    throw new Error('Invalid question');
  }
  if (!procedure || typeof procedure !== 'string') {
    throw new Error('Invalid procedure name');
  }

  // Detect if question contains non-ASCII characters (likely non-English)
  const hasNonAscii = /[^\u0000-\u007F]/.test(question);
  const langHint = hasNonAscii ? '\n\nIMPORTANT: The patient asked in a non-English language. You MUST respond in the SAME language they used. Match their language exactly.' : '';

  const prompt = `You are a helpful medical consent assistant. Patient is preparing for "${procedure}".

Rules: No medical advice, no diagnosis, be calm and factual, under 150 words, tell them to ask their doctor if unsure.${langHint}

Question: "${question}"

Answer helpfully:`;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: TEMPERATURE,
    top_p: TOP_P,
  };

  const data = await callOpenRouter(payload);
  return data.choices[0].message.content;
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(payload) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'Medical Consent App',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  console.log('📥 OpenRouter response status:', response.status);

  if (!response.ok) {
    console.error('OpenRouter error:', response.status, data);
    throw new Error(`OpenRouter API error: ${response.status} - ${data.error?.message || 'Unknown'}`);
  }

  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data;
  }

  if (data.message || data.content) {
    return {
      choices: [{
        message: {
          content: data.message || data.content
        }
      }]
    };
  }

  console.error('Unexpected response structure:', JSON.stringify(data).slice(0, 500));
  throw new Error('Invalid API response structure');
}

/**
 * Fallback content builder
 */
function buildFallbackContent(procedure, patientName, doctorName) {
  return {
    overview: `${procedure} is a procedure performed to address a specific medical need. It is explained in simple steps so you can feel informed and comfortable.`,
    steps: [
      { title: 'Anesthesia', description: 'You will receive anesthesia to keep you comfortable and pain-free during the procedure.' },
      { title: 'Small Incisions', description: 'Small surgical incisions are made to allow access for the instruments needed.' },
      { title: 'Procedure', description: 'The main surgical steps are performed carefully by your experienced surgical team.' },
      { title: 'Closure', description: 'Incisions are closed with dissolvable stitches or surgical glue.' },
      { title: 'Recovery Start', description: 'You begin recovery with monitoring and pain management in the recovery room.' },
    ],
    risks: [
      { title: 'Infection', description: 'Minor infection at the incision sites can occur but is treatable with antibiotics.', likelihood: '2-5%' },
      { title: 'Bleeding', description: 'Rare internal bleeding that may require monitoring or additional care.', likelihood: '1-2%' },
      { title: 'Anesthesia Reaction', description: 'Very rare allergic or adverse reaction to anesthesia medications.', likelihood: 'less than 1%' },
    ],
    alternatives: [
      { title: 'Open Surgery', description: 'Traditional surgical approach with one larger incision instead of small ones.', whenRecommended: 'When minimally invasive approach is not suitable for your condition' },
      { title: 'Medical Management', description: 'Medication-focused approach to manage the condition without surgery.', whenRecommended: 'Only for select cases where surgery can be deferred or avoided' },
    ],
    recovery: {
      summary: 'Most patients go home within 2 days and resume light activities within a week. Full recovery typically takes about 1-2 weeks depending on the specific procedure and individual healing.',
      timeline: [
        { label: 'Day 0', description: 'Surgery day with monitoring in recovery room. Rest and pain management.' },
        { label: 'Day 1', description: 'Light walking encouraged. Soft diet. Pain control medications as prescribed.' },
        { label: 'Day 2-3', description: 'Often ready for discharge. Follow wound care instructions carefully.' },
        { label: 'Week 1', description: 'Most routine activities can resume. Continue following medical restrictions.' },
      ],
      do: [
        'Take all prescribed medications as directed',
        'Walk lightly as advised by your medical team',
        'Keep incisions clean and dry',
        'Attend all follow-up appointments',
        'Rest and get adequate sleep',
      ],
      dont: [
        'Lift heavy objects (more than 10 lbs)',
        'Do strenuous exercise or sports',
        'Submerge incisions in water until cleared',
        'Drive until approved by your doctor',
        'Ignore signs of infection or complications',
      ],
    },
    quiz: buildQuizForProcedure(procedure),
    metadata: { procedure, patientName, doctorName },
    plainTextSummary: `${procedure}: This is a medical procedure performed to address your specific health condition. It involves careful surgical steps, risks are monitored and minimized, and recovery is typically quick. Most patients go home within 2 days and resume normal activities within 1-2 weeks with proper follow-up care.`,
  };
}