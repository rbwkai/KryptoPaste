import { config } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db.js';
import { Paste } from '../src/models/paste.js';

await connectDb(config.mongodbUri);
await Paste.init(); // makes sure the indexes exist

if (process.argv[2] === 'count') {
  console.log('pastes in db:', await Paste.countDocuments());
} else {
  const paste = await Paste.create({
    ciphertext: 'dGVzdA',
    iv: 'AAAAAAAAAAAAAAAA',
    deleteTokenHash: 'x',
    expiresAt: new Date(Date.now() + 10_000), // expires in 10 seconds
  });
  console.log('created paste with id:', paste._id);
  console.log('indexes:', JSON.stringify(await Paste.collection.indexes()));
}

await disconnectDb();
