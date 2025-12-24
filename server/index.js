const fastify = require('fastify')({ logger: true });
require('dotenv').config();

fastify.register(require('@fastify/cors'), { 
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://blindtech.ices.edu.np',      // Production UI
        /\.pages\.dev$/                        // Cloudflare Pages preview deployments
      ]
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using default insecure secret.');
}

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'supersecret'
});

fastify.register(require('@fastify/cookie'));

fastify.register(require('@fastify/websocket'));

fastify.decorate('authenticate', async function (request, reply) {
  try {
    const token = request.cookies.token;
    if (token) {
      // Manually verify since jwtVerify usually checks header
      const decoded = fastify.jwt.verify(token);
      request.user = decoded;
    } else {
      await request.jwtVerify();
    }
  } catch (err) {
    reply.send(err);
  }
});

fastify.register(require('./routes/auth'));
fastify.register(require('./routes/game'));

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
