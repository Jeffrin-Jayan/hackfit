import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail, createUser, getUserById, updateUser } from '../models/database.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRATION_HOURS = 24;

function createAccessToken(userId, email) {
  const expire = Math.floor(Date.now() / 1000) + JWT_EXPIRATION_HOURS * 3600;
  const payload = { sub: userId, email, exp: expire };
  return jwt.sign(payload, JWT_SECRET);
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(401);
    req.user = user;
    next();
  });
}

function formatUserResponse(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    display_name: user.display_name,
    current_phase: user.current_phase,
    phases_completed: user.phases_completed,
    voice_status: user.voice_status,
    code_status: user.code_status,
    peer_status: user.peer_status,
    voice_score: user.voice_score,
    code_score: user.code_score,
    peer_score: user.peer_score,
    overall_score: user.overall_score,
    is_verified: user.is_verified || false,
  };
}

router.post('/register', async (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password required' });
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ detail: 'Email already registered' });
  }
  if (password.length < 6) {
    return res.status(400).json({ detail: 'Password must be at least 6 characters' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const userId = await createUser({
    email,
    password_hash,
    display_name,
    created_at: new Date(),
    updated_at: new Date(),
    current_phase: 'voice',
    phases_completed: [],
    voice_status: 'not_started',
    code_status: 'not_started',
    peer_status: 'not_started',
    voice_score: null,
    code_score: null,
    peer_score: null,
    overall_score: null,
    is_verified: false,
    verification_date: null,
  });
  const user = await getUserById(userId);
  const token = createAccessToken(userId, email);
  res.json({ access_token: token, token_type: 'bearer', user: formatUserResponse(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }
  const userId = user._id.toString();
  const token = createAccessToken(userId, email);
  await updateUser(userId, { updated_at: new Date() });
  res.json({ access_token: token, token_type: 'bearer', user: formatUserResponse(user) });
});

router.get('/me', authenticateToken, async (req, res) => {
  const userId = req.user.sub;
  const user = await getUserById(userId);
  if (!user) return res.sendStatus(404);
  res.json(formatUserResponse(user));
});

router.post('/logout', (req, res) => {
  // no server-side state for JWTs
  res.json({ message: 'Logged out' });
});

export default router;
