import mongoose from 'mongoose';

// Enums
export const AssessmentPhase = {
  VOICE: 'voice',
  CODE: 'code',
  PEER: 'peer',
};

export const AssessmentStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PASSED: 'passed',
  FAILED: 'failed',
};

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  display_name: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  current_phase: { type: String, enum: Object.values(AssessmentPhase), default: AssessmentPhase.VOICE },
  phases_completed: [String],
  voice_status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.NOT_STARTED },
  code_status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.NOT_STARTED },
  peer_status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.NOT_STARTED },
  voice_score: Number,
  code_score: Number,
  peer_score: Number,
  overall_score: Number,
  is_verified: { type: Boolean, default: false },
  verification_date: Date,
});

export const User = mongoose.model('User', userSchema);

// Session schema
const sessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phase: { type: String, enum: Object.values(AssessmentPhase), required: true },
  topic: { type: String, required: true },
  difficulty: { type: String, default: 'intermediate' },
  status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.IN_PROGRESS },
  started_at: { type: Date, default: Date.now },
  completed_at: Date,
  responses: { type: Array, default: [] },
  evaluation: { type: Object },
  overall_score: Number,
  passed: { type: Boolean, default: false },
  metrics: { type: Object, default: {} },
});

export const Session = mongoose.model('Session', sessionSchema);

// helper functions
export async function getUserByEmail(email) {
  return User.findOne({ email }).lean();
}

export async function getUserById(id) {
  return User.findById(id).lean();
}

export async function createUser(userData) {
  const user = new User(userData);
  const saved = await user.save();
  return saved._id.toString();
}

export async function updateUser(id, updateData) {
  updateData.updated_at = new Date();
  const result = await User.updateOne({ _id: id }, { $set: updateData });
  return result.modifiedCount > 0;
}

export async function createSession(sessionData) {
  const session = new Session(sessionData);
  const saved = await session.save();
  return saved._id.toString();
}

export async function getSession(id) {
  return Session.findById(id).lean();
}

export async function getUserSessions(userId, phase) {
  const query = { user_id: userId };
  if (phase) query.phase = phase;
  return Session.find(query).sort({ started_at: -1 }).lean();
}

export async function updateSession(id, updateData) {
  // if the caller already included update operators, use as-is
  const hasOperator = Object.keys(updateData).some((k) => k.startsWith('$'));
  const updateQuery = hasOperator ? updateData : { $set: updateData };
  const result = await Session.updateOne({ _id: id }, updateQuery);
  return result.modifiedCount > 0;
}

export async function updateUserPhaseProgress(userId, phase, passed, score) {
  const updateData = { updated_at: new Date() };
  if (phase === AssessmentPhase.VOICE) {
    updateData.voice_status = passed ? AssessmentStatus.PASSED : AssessmentStatus.FAILED;
    updateData.voice_score = score;
    if (passed) updateData.current_phase = AssessmentPhase.CODE;
  } else if (phase === AssessmentPhase.CODE) {
    updateData.code_status = passed ? AssessmentStatus.PASSED : AssessmentStatus.FAILED;
    updateData.code_score = score;
    if (passed) updateData.current_phase = AssessmentPhase.PEER;
  } else if (phase === AssessmentPhase.PEER) {
    updateData.peer_status = passed ? AssessmentStatus.PASSED : AssessmentStatus.FAILED;
    updateData.peer_score = score;
    if (passed) {
      updateData.is_verified = true;
      updateData.verification_date = new Date();
    }
  }
  if (passed) {
    await User.updateOne({ _id: userId }, { $addToSet: { phases_completed: phase } });
  }
  await User.updateOne({ _id: userId }, { $set: updateData });
  // compute overall score if available
  const user = await getUserById(userId);
  if (
    user &&
    user.voice_score != null &&
    user.code_score != null &&
    user.peer_score != null
  ) {
    const overall = (user.voice_score + user.code_score + user.peer_score) / 3;
    await User.updateOne({ _id: userId }, { $set: { overall_score: overall } });
  }
}
