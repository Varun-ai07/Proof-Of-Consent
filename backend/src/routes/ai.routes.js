import express from 'express';
import { 
  generateConsentExplanation, 
  generatePatientConsentContent,
  answerPatientQuestion 
} from '../services/ai.service.js';

const router = express.Router();

/**
 * POST /api/ai/explain
 * Legacy endpoint: Generate simple text explanation of a procedure
 */
router.post('/explain', async (req, res) => {
  try {
    const { procedure } = req.body;

    if (!procedure) {
      return res.status(400).json({ 
        success: false,
        error: 'Procedure name is required' 
      });
    }

    const explanation = await generateConsentExplanation(procedure);
    
    res.json({ 
      success: true,
      explanation 
    });
  } catch (err) {
    console.error('AI explain error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate explanation',
      details: err.message 
    });
  }
});

/**
 * POST /api/ai/generate-content
 * Generate structured, patient-friendly consent content aligned with patient.html sections
 * Returns: overview, steps, risks, alternatives, recovery timeline, quiz questions
 */
router.post('/generate-content', async (req, res) => {
  try {
    const { procedure, patientName, doctorName, language = 'en' } = req.body;

    if (!procedure) {
      return res.status(400).json({ 
        success: false,
        error: 'Procedure name is required' 
      });
    }

    const content = await generatePatientConsentContent({
      procedure,
      patientName: patientName || 'Patient',
      doctorName: doctorName || 'Your Doctor',
      language
    });

    res.json({ 
      success: true,
      content 
    });
  } catch (err) {
    console.error('AI generate content error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate content',
      details: err.message 
    });
  }
});

/**
 * POST /api/ai/ask
 * AI Chat endpoint for patient questions about their procedure
 * Now uses real AI instead of hardcoded responses
 */
router.post('/ask', async (req, res) => {
  try {
    const { question, procedure, consentId, patientContext } = req.body;

    if (!question || !procedure) {
      return res.status(400).json({ 
        success: false,
        error: 'Question and procedure are required' 
      });
    }

    // Validate question length
    if (question.length < 3) {
      return res.status(400).json({ 
        success: false,
        error: 'Question must be at least 3 characters' 
      });
    }

    if (question.length > 1000) {
      return res.status(400).json({ 
        success: false,
        error: 'Question must be less than 1000 characters' 
      });
    }

    // Call the real AI service
    const answer = await answerPatientQuestion({
      question,
      procedure,
      patientContext: patientContext || null
    });

    res.json({ 
      success: true,
      answer,
      procedure,
      consentId: consentId || null,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('AI ask error:', err);
    
    // Fallback response if AI fails
    const fallbackAnswer = `Thank you for your question about "${req.body.procedure}". For the most accurate and personalized information, please discuss this directly with your doctor or medical team. They can provide guidance specific to your situation.`;
    
    res.json({ 
      success: true,
      answer: fallbackAnswer,
      procedure: req.body.procedure,
      consentId: req.body.consentId || null,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

export default router;