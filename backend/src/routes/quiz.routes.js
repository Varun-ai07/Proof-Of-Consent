// src/routes/quiz.routes.js
import express from 'express';

const router = express.Router();

// TEMP stub endpoint
router.post('/verify', (req, res) => {
  res.json({
    passed: false,
    message: 'Quiz verification stub (working)',
  });
});

export default router;
