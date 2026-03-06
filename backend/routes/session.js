import express from 'express';
import { Types } from 'mongoose';
import {
  createSession,
  getSession,
  getUserSessions,
  updateSession,
  updateUserPhaseProgress,
  getUserById,
  updateUser,
} from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

router.post('/create', authenticateToken, async (req, res) => {
  const userId = req.user.sub;
  const user = await getUserById(userId);
  if (!user) return res.status(401).json({ detail: 'User not found' });
  const { skill_topic, phase = 'voice', difficulty = 'intermediate' } = req.body;
  const lowerPhase = phase.toLowerCase();
  if (lowerPhase === 'code' && user.voice_status !== 'passed') {
    return res.status(403).json({ detail: 'Must pass Voice Assessment to access Code Challenge' });
  }
  if (lowerPhase === 'peer' && user.code_status !== 'passed') {
    return res.status(403).json({ detail: 'Must pass Code Challenge to access Peer Session' });
  }
  const sessionDoc = {
    user_id: userId,
    phase: lowerPhase,
    topic: skill_topic,
    difficulty,
    status: 'in_progress',
    started_at: new Date(),
    completed_at: null,
    responses: [],
    evaluation: null,
    overall_score: null,
    passed: false,
    metrics: {},
  };
  const sessionId = await createSession(sessionDoc);
  const phaseStatusField = `${lowerPhase}_status`;
  await updateUser(userId, { [phaseStatusField]: 'in_progress' });
  res.json({ session_id: sessionId, phase: lowerPhase, topic: skill_topic, status: 'in_progress' });
});

router.get('/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const session = await getSession(sessionId);
  if (!session) return res.status(404).json({ detail: 'Session not found' });
  if (session.user_id.toString() !== req.user.sub) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  res.json(session);
});

router.post('/:sessionId/response', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const { question_id, question, transcript, audio_metrics } = req.body;
  const session = await getSession(sessionId);
  if (!session) return res.status(404).json({ detail: 'Session not found' });
  if (session.user_id.toString() !== req.user.sub) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  if (session.status !== 'in_progress') {
    return res.status(400).json({ detail: 'Session is not active' });
  }
  await updateSession(sessionId, {
    $push: {
      responses: {
        question_id,
        question,
        transcript,
        audio_metrics,
        submitted_at: new Date(),
      },
    },
  });
  res.json({ message: 'Response submitted successfully', question_id });
});

router.post('/complete', authenticateToken, async (req, res) => {
  const { session_id, phase, passed, score, evaluation } = req.body;
  const userId = req.user.sub;
  const lowerPhase = phase.toLowerCase();
  if (!['voice', 'code', 'peer'].includes(lowerPhase)) {
    return res.status(400).json({ detail: 'Invalid phase' });
  }
  if (session_id) {
    await updateSession(session_id, {
      status: 'completed',
      completed_at: new Date(),
      overall_score: score,
      passed,
      evaluation,
    });
  }
  await updateUserPhaseProgress(userId, lowerPhase, passed, score);
  res.json({ message: 'Phase completed' });
});

router.get('/user/:userId/history', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.sub) {
    return res.status(403).json({ detail: 'Access denied' });
  }
  const sessions = await getUserSessions(userId);
  res.json(sessions);
});

export default router;
