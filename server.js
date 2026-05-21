const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://sasakovacevc_db_user:keA2xixr9rIjujov@cluster0.w3fi9vy.mongodb.net/?appName=Cluster0';
const DB_NAME = 'more_app';
const COL = 'state';

let data = { expenses: [], rate: 117 };
let db = null;

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME).collection(COL);
    console.log('MongoDB connected!');
    // Load saved data
    const saved = await db.findOne({ _id: 'main' });
    if (saved) {
      data = { expenses: saved.expenses || [], rate: saved.rate || 117 };
      console.log('Loaded', data.expenses.length, 'expenses from DB');
    }
  } catch(e) {
    console.error('MongoDB error:', e.message);
  }
}

async function saveDB() {
  if (!db) return;
  try {
    await db.updateOne(
      { _id: 'main' },
      { $set: { expenses: data.expenses, rate: data.rate } },
      { upsert: true }
    );
  } catch(e) {
    console.error('Save error:', e.message);
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', data }));

  ws.on('message', async (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'update') {
        data = parsed.data;
        await saveDB();
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

connectDB().then(() => {
  server.listen(PORT, () => console.log('Server running on port', PORT));
});
