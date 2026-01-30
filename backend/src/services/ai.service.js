import fetch from 'node-fetch';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free';
const TEMPERATURE = 0.85;
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

  console.log(`🤖 Generating AI content for: ${procedure}`);

  const prompt = `You are a medical consent assistant. Explain the procedure "${procedure}" for a patient named ${patientName}.

OVERVIEW:
Write 2-3 clear sentences explaining what ${procedure} is and why it's performed.

STEPS:
1. Preparation - describe pre-operative preparation
2. Anesthesia - describe the anesthesia process
3. Procedure - describe the main surgical steps specific to ${procedure}
4. Closure - describe how the surgery is completed
5. Recovery Room - describe immediate post-op care

RISKS (specific to ${procedure}):
1. [Risk name] - [description] - [percentage like 2-5%]
2. [Risk name] - [description] - [percentage]
3. [Risk name] - [description] - [percentage]
4. [Risk name] - [description] - [percentage]

RECOVERY:
Write 2-3 sentences about the recovery timeline specific to ${procedure}.

DO (after ${procedure}):
1. [specific instruction]
2. [specific instruction]
3. [specific instruction]
4. [specific instruction]
5. [specific instruction]

DONT (after ${procedure}):
1. [specific restriction]
2. [specific restriction]
3. [specific restriction]
4. [specific restriction]
5. [specific restriction]

Use plain text only. No markdown. No asterisks. Be specific to ${procedure}.`;

  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: TEMPERATURE,
    top_p: TOP_P,
    max_tokens: 1500,
  };

  try {
    console.log('📡 Calling OpenRouter API...');
    const data = await callOpenRouter(payload);
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('📥 AI Response received, length:', content.length);
    
    if (!content || content.length < 100) {
      console.warn('⚠️ AI response too short, using fallback');
      return buildFallbackContent(procedure, patientName, doctorName);
    }

    // Parse the response
    const parsed = parseEnhancedResponse(content, procedure);
    
    console.log('✅ Parsed content:', {
      overviewLength: parsed.overview?.length,
      stepsCount: parsed.steps?.length,
      risksCount: parsed.risks?.length,
      dosCount: parsed.do?.length,
      dontsCount: parsed.dont?.length
    });

    return {
      overview: parsed.overview || `${procedure} is a surgical procedure performed to treat your condition.`,
      steps: parsed.steps.length >= 3 ? parsed.steps : buildFallbackContent(procedure).steps,
      risks: parsed.risks.length >= 2 ? parsed.risks : buildFallbackContent(procedure).risks,
      alternatives: [
        { 
          title: 'Open Surgery', 
          description: 'Traditional surgical approach with a larger incision.', 
          whenRecommended: 'When minimally invasive approach is not suitable' 
        },
        { 
          title: 'Medical Management', 
          description: 'Medication-based treatment without surgery.', 
          whenRecommended: 'When surgery can be safely deferred' 
        },
      ],
      recovery: {
        summary: parsed.recovery || `Recovery from ${procedure} typically takes 4-6 weeks with proper care.`,
        timeline: [
          { label: 'Day 1', description: 'Hospital recovery with monitoring and pain management.' },
          { label: 'Day 2-3', description: 'Begin light walking. May be discharged home.' },
          { label: 'Week 1-2', description: 'Rest at home. Light activities only. Follow-up appointment.' },
          { label: 'Week 4-6', description: 'Gradual return to normal activities as approved by doctor.' },
        ],
        do: parsed.do.length >= 3 ? parsed.do : [
          'Take all prescribed medications on schedule',
          'Walk short distances daily to prevent blood clots',
          'Keep surgical site clean and dry',
          'Attend all follow-up appointments',
          'Get plenty of rest and sleep'
        ],
        dont: parsed.dont.length >= 3 ? parsed.dont : [
          'Lift anything heavier than 10 pounds',
          'Drive until cleared by your doctor',
          'Submerge incision in water (baths, pools)',
          'Skip doses of prescribed medications',
          'Ignore signs of infection (fever, redness, discharge)'
        ],
      },
      quiz: buildQuizForProcedure(procedure),
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
 * Enhanced parser that extracts DO and DONT lists
 */
function parseEnhancedResponse(content, procedure) {
  const result = {
    overview: '',
    steps: [],
    risks: [],
    recovery: '',
    do: [],
    dont: [],
  };

  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lowerLine = trimmed.toLowerCase();
    
    // Detect section headers
    if (lowerLine.startsWith('overview') || lowerLine === 'overview:') {
      currentSection = 'overview';
      continue;
    } else if (lowerLine.startsWith('steps') || lowerLine === 'steps:') {
      currentSection = 'steps';
      continue;
    } else if (lowerLine.startsWith('risks') || lowerLine === 'risks:') {
      currentSection = 'risks';
      continue;
    } else if (lowerLine.startsWith('recovery') || lowerLine === 'recovery:') {
      currentSection = 'recovery';
      continue;
    } else if (lowerLine.startsWith('do ') || lowerLine === 'do:' || lowerLine.startsWith('do (')) {
      currentSection = 'do';
      continue;
    } else if (lowerLine.startsWith('dont') || lowerLine.startsWith("don't") || lowerLine === 'dont:') {
      currentSection = 'dont';
      continue;
    }

    // Parse content based on section
    switch (currentSection) {
      case 'overview':
        const cleanOverview = trimmed.replace(/^[:\-]\s*/, '');
        if (cleanOverview.length > 10 && !cleanOverview.toLowerCase().startsWith('step')) {
          result.overview += (result.overview ? ' ' : '') + cleanOverview;
        }
        break;

      case 'steps':
        if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed)) {
          const cleanLine = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '');
          const separatorMatch = cleanLine.match(/^([^:\-–]+)[:\-–]\s*(.+)$/);
          
          if (separatorMatch) {
            result.steps.push({ 
              title: separatorMatch[1].trim(), 
              description: separatorMatch[2].trim() 
            });
          } else if (cleanLine.length > 10) {
            result.steps.push({ 
              title: `Step ${result.steps.length + 1}`, 
              description: cleanLine 
            });
          }
        }
        break;

      case 'risks':
        if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed)) {
          const cleanLine = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '');
          const percentMatch = cleanLine.match(/(\d+(?:[-.]\d+)?%|less than \d+%|<\s*\d+%)/i);
          const likelihood = percentMatch ? percentMatch[1] : '1-5%';
          
          const parts = cleanLine.replace(/\s*[-–]\s*\d+(?:[-.]\d+)?%/g, '').split(/\s*[-–:]\s*/);
          
          if (parts[0] && parts[0].length > 2) {
            result.risks.push({
              title: parts[0].trim(),
              description: parts.slice(1).join(' ').trim() || 'May occur in some patients.',
              likelihood: likelihood,
            });
          }
        }
        break;

      case 'recovery':
        const cleanRecovery = trimmed.replace(/^[:\-]\s*/, '');
        if (cleanRecovery.length > 10 && !/^\d+[\.\)]/.test(cleanRecovery)) {
          result.recovery += (result.recovery ? ' ' : '') + cleanRecovery;
        }
        break;

      case 'do':
        if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed)) {
          const item = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim();
          if (item.length > 5) {
            result.do.push(item);
          }
        }
        break;

      case 'dont':
        if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed)) {
          const item = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim();
          if (item.length > 5) {
            result.dont.push(item);
          }
        }
        break;
    }
  }

  return result;
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
 */
export async function answerPatientQuestion({ question, procedure, patientContext }) {
  if (!question || typeof question !== 'string') {
    throw new Error('Invalid question');
  }
  if (!procedure || typeof procedure !== 'string') {
    throw new Error('Invalid procedure name');
  }

  const prompt = `You are a helpful medical consent assistant. Patient is preparing for "${procedure}".

Rules: No medical advice, no diagnosis, be calm and factual, under 150 words, tell them to ask their doctor if unsure.

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