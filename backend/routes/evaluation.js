import express from 'express';
import { evaluateWithGemini, checkResponseConsistency } from '../services/gemini_service.js';
const router = express.Router();

router.post('/', async (req, res) => {
  const { session_id, question, topic, transcript, audio_metrics } = req.body;
  try {
    const result = await evaluateWithGemini({ topic, question, transcript, audio_metrics });
    res.json({
      session_id,
      overall_score: result.overall_score,
      passed: result.overall_score >= 6.0,
      dimensions: result.dimensions,
      blind_spots: result.blind_spots,
      strengths: result.strengths,
      recommendations: result.recommendations,
      evaluated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ detail: `Evaluation failed: ${err.message}` });
  }
});

router.post('/batch', async (req, res) => {
  const { session_id, responses } = req.body;
  const results = [];
  for (const r of responses) {
    const result = await evaluateWithGemini(r);
    results.push(result);
  }
  let avg_score = 0;
  let passed = false;
  if (results.length > 0) {
    avg_score = results.reduce((sum, r) => sum + r.overall_score, 0) / results.length;
    passed = avg_score >= 6.0;
  }
  res.json({ session_id, individual_results: results, aggregate_score: avg_score, passed, total_responses: results.length });
});

router.post('/consistency-check', async (req, res) => {
  const { session_id, responses } = req.body;
  try {
    const result = await checkResponseConsistency(responses);
    res.json({ session_id, ...result });
  } catch (err) {
    res.status(500).json({ detail: `Consistency check failed: ${err.message}` });
  }
});

router.get('/:session_id', (req, res) => {
  res.json({ session_id: req.params.session_id, message: 'Evaluation results will be fetched from database' });
});

export default router;
