async function gameRoutes(fastify, options) {
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    return request.user;
  });

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', message => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong' }));
        } else {
          connection.socket.send(JSON.stringify({ type: 'echo', data }));
        }
      } catch (e) {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });
  });
}

module.exports = gameRoutes;
