function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 6209,
  mongodbUri: required('MONGODB_URI'),
  // How many proxies sit in front of the app: 0 on your laptop.
  // On Render we will find the right number at deploy time.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
};
