import { Router } from 'express';
import { evaluateAnswers, generateQuestions } from '../services/openRouter.service.js';

const router = Router();
const interviewTypes = new Set(['Technical', 'Behavioral', 'Mixed']);

function isText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

router.post('/questions', async (request, response, next) => {
  const { role, level, interviewType, resumeText = '' } = request.body || {};
  if (
    !isText(role, 120) ||
    !isText(level, 60) ||
    !interviewTypes.has(interviewType) ||
    typeof resumeText !== 'string' ||
    resumeText.length > 20000
  ) {
    return response.status(400).json({ success: false, message: 'Please provide valid interview details.' });
  }

  try {
    const questions = await generateQuestions({ role, level, interviewType, resumeText });
    response.json({ success: true, data: { questions } });
  } catch (error) {
    next(error);
  }
});

router.post('/evaluate', async (request, response, next) => {
  const { role, level, answers } = request.body || {};
  if (
    !isText(role, 120) ||
    !isText(level, 60) ||
    !Array.isArray(answers) ||
    answers.length < 1 ||
    answers.length > 8 ||
    answers.some((item) =>
      !item ||
      !isText(item.question, 1000) ||
      typeof item.answer !== 'string' ||
      item.answer.length > 5000
    )
  ) {
    return response.status(400).json({ success: false, message: 'Please provide valid interview answers.' });
  }

  try {
    const evaluation = await evaluateAnswers({ role, level, answers });
    response.json({ success: true, data: { evaluation } });
  } catch (error) {
    next(error);
  }
});

export default router;
