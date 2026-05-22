const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

app.get('/time', (req, res) => {
  res.json({ datetime: new Date().toISOString() });
});

app.post('/sync-time', (req, res) => {
  const { datetime, deviceIp } = req.body;
  console.log(`[SYNC] von ${deviceIp} - Zeit: ${datetime}`);
  res.json({ status: 'ok', received: datetime });
});

const PORT = 4001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Zeit-Server läuft auf Port ${PORT}`);
});