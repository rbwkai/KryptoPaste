import helmet from 'helmet';

// Strict CSP: everything is blocked unless we allow it.
// No inline scripts, no third-party scripts, no framing, no forms.
const directives = {
  defaultSrc: ["'none'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
  frameAncestors: ["'none'"],
  objectSrc: ["'none'"],
};

export const securityHeaders = [
  helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
  }),
  // Turn off browser features we never use.
  (_req, res, next) => {
    res.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    next();
  },
];
