import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';

const pasteSchema = new mongoose.Schema(
  {
    // The paste id: 16 random bytes, URL-safe. Not secret, but unguessable.
    _id: {
      type: String,
      default: () => randomBytes(16).toString('base64url'),
    },
    ciphertext: { type: String, required: true }, // base64url, encrypted in the browser
    iv: { type: String, required: true }, // base64url, 12 random bytes
    burn: { type: Boolean, default: false }, // delete after first read
    deleteTokenHash: { type: String, required: true }, // hash only, never the token
    expiresAt: { type: Date, required: true },
  },
  // No createdAt/updatedAt on purpose: store as little metadata as possible.
  { versionKey: false, timestamps: false },
);

// TTL index: MongoDB deletes the document once expiresAt has passed.
pasteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Paste = mongoose.model('Paste', pasteSchema);
