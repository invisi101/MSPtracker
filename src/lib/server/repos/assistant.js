// Conversation history for the AI assistant on the Assistant page.
import { getDb } from '../db.js';

export function getMessages(limit = 40) {
  return getDb().prepare('SELECT * FROM coach_messages ORDER BY id DESC LIMIT ?').all(limit).reverse();
}
export function addMessage(role, content) {
  getDb().prepare('INSERT INTO coach_messages (role, content) VALUES (?,?)').run(role, content);
}
export function clearMessages() { getDb().prepare('DELETE FROM coach_messages').run(); }
