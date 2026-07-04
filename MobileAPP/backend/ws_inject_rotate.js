const WebSocket = require('ws');

const url = process.argv[2] || 'ws://192.168.1.100:81';
const ws = new WebSocket(url);

function sendAfter(delayMs, frame) {
  setTimeout(() => {
    console.log('TX', frame);
    ws.send(frame + '\n');
  }, delayMs);
}

ws.on('open', () => {
  console.log('OPEN', url);
  sendAfter(0, 'START');
  sendAfter(700, 'SPD:180:-180');
  sendAfter(1800, 'STOP');
  sendAfter(2600, 'SPD:-180:180');
  sendAfter(3800, 'STOP');
  setTimeout(() => ws.close(), 5000);
});

ws.on('message', (msg) => {
  console.log('RX', msg.toString().trim());
});

ws.on('error', (err) => {
  console.error('WS_ERR', err.message);
  process.exitCode = 1;
});

ws.on('close', () => {
  console.log('CLOSE');
  process.exit();
});
