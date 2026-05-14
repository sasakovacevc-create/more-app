const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// In-memory store (resets on restart, fine for a trip)
let data = { expenses: [], rate: 117 };

wss.on('connection', (ws) => {
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'init', data }));

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'update') {
        data = parsed.data;
        // Broadcast to all OTHER clients
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update', data }));
          }
        });
      }
    } catch(e) {}
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
