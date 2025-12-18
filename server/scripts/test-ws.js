const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', function open() {
  console.log('connected');
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', function incoming(data) {
  console.log('received: %s', data);
  ws.close();
});

ws.on('error', function error(err) {
  console.error('error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('disconnected', code, reason.toString());
});
