const fp = require('fastify-plugin');

async function gameRoutes(fastify, options) {
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    return request.user;
  });

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    fastify.log.info('Client connected to websocket');
    connection.socket.on('message', message => {
      try {
        const msgString = message.toString();
        fastify.log.info(`Received message: ${msgString}`);
        const data = JSON.parse(msgString);
        if (data.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong' }));
        } else {
          connection.socket.send(JSON.stringify({ type: 'echo', data }));
        }
      } catch (e) {
        fastify.log.error('WebSocket error:', e);
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });
    
    connection.socket.on('close', () => {
      fastify.log.info('Client disconnected');
    });
  });
}

module.exports = fp(gameRoutes);
