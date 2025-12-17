const fastify = require('fastify')({ logger: true });
require('dotenv').config();

fastify.register(require('@fastify/cors'), { 
  origin: true 
});

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'supersecret'
});

fastify.register(require('@fastify/websocket'));

fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
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
