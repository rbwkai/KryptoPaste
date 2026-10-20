import { createApp } from './app.js';

const port = Number(process.env.PORT) || 6209;

createApp().listen(port, () => {
  console.log(`KryptoPaste server listening on port ${port}`);
});
