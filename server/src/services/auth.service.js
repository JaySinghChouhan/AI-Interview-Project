import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { connectToDatabase } from './database.service.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function createSession(user) {
  const token = randomBytes(32).toString('base64url');
  await Session.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  return { token, user: toPublicUser(user) };
}

export async function registerUser({ name, email, password }) {
  await connectToDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), passwordHash });
  return createSession(user);
}

export async function loginUser({ email, password }) {
  await connectToDatabase();
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    const error = new Error('Email or password is incorrect.');
    error.status = 401;
    throw error;
  }

  return createSession(user);
}

export async function findUserForSession(token) {
  if (!token || token.length > 128) return null;
  await connectToDatabase();

  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).populate('userId', 'name email role');

  if (!session?.userId) return null;
  return { session, user: toPublicUser(session.userId) };
}

export async function deleteSession(token) {
  if (!token || token.length > 128) return;
  await connectToDatabase();
  await Session.deleteOne({ tokenHash: hashToken(token) });
}

export const sessionTtlMs = SESSION_TTL_MS;
