import { Router } from 'express';
import { HttpError } from '../middleware/error-handler.js';
import { Paste } from '../models/paste.js';
import { ID_PATTERN, parseCreateBody } from '../paste-rules.js';
import { createDeleteToken } from '../tokens.js';
import { createLimiter } from '../middleware/rate-limit.js';

export const pastesRouter = Router();

// Never let browsers or proxies keep a copy of a paste.
pastesRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

pastesRouter.post('/', createLimiter, async (req, res) => {
  const { ciphertext, iv, ttlSeconds, burn } = parseCreateBody(req.body);
  const { token, hash } = createDeleteToken();

  const paste = await Paste.create({
    ciphertext,
    iv,
    burn,
    deleteTokenHash: hash,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });

  res.status(201).json({ id: paste._id, deleteToken: token });
});

pastesRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ID_PATTERN.test(id)) {
    throw new HttpError(404, 'not_found');
  }

  const now = new Date();

  // Step 1: try to take a burn-after-read paste. Find + delete is ONE atomic
  // database action, so only one reader can ever get it.
  // Step 2: otherwise read a normal paste.
  // We check expiresAt ourselves because the TTL cleaner is slow.
  const paste =
    (await Paste.findOneAndDelete({
      _id: id,
      burn: true,
      expiresAt: { $gt: now },
    }).lean()) ??
    (await Paste.findOne({
      _id: id,
      burn: false,
      expiresAt: { $gt: now },
    }).lean());

  if (!paste) {
    throw new HttpError(404, 'not_found');
  }

  res.json({ ciphertext: paste.ciphertext, iv: paste.iv, burn: paste.burn });
});
