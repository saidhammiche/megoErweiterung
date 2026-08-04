const express = require('express');
const cors = require('cors');
const axios = require('axios');
const os = require('os');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MESSEKOPFER_IP = '192.168.1.7';
const MESSEKOPFER_ID = 51105;

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ==================== NOUVEAU : PING MESSEKOPFER ====================
app.get('/ping-messekoffer', async (req, res) => {
  console.log('📡 Ping Messekoffer...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://${MESSEKOPFER_IP}/get_sys_config.cgi?id=${MESSEKOPFER_ID}&sys=time&TimezoneOffset=-120`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Messekoffer erreichbar');
      res.json({ status: 'online' });
    } else {
      console.log('❌ Messekoffer antwortet nicht OK');
      res.json({ status: 'offline' });
    }
  } catch (error) {
    console.log('❌ Messekoffer nicht erreichbar:', error.message);
    res.json({ status: 'offline', error: error.message });
  }
});

// Test endpoint
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// ==================== LIRE L'HEURE (MODIFIÉ : FORMAT JJ-MM-AAAA) ====================
app.get('/time', async (req, res) => {
  console.log('📡 Lecture heure du Messekoffer...');
  try {
    const url = `http://${MESSEKOPFER_IP}/get_sys_config.cgi?id=${MESSEKOPFER_ID}&sys=time&TimezoneOffset=-120`;
    const response = await axios.get(url, { timeout: 5000 });
    
    let messekofferTime = null;
    if (response.data && typeof response.data === 'string') {
      const match = response.data.match(/curtime=([^\n]+)/);
      if (match) {
        let rawTime = match[1];
        // Conversion du format MM/DD/YY HH:MM:SS vers DD-MM-YYYY HH:MM:SS
        const parts = rawTime.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
          // parts[1] = mois, parts[2] = jour, parts[3] = année (2 chiffres)
          // parts[4] = heure, parts[5] = minute, parts[6] = seconde
          const day = parts[2];
          const month = parts[1];
          const year = '20' + parts[3];
          const hour = parts[4];
          const minute = parts[5];
          const second = parts[6];
          messekofferTime = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
          console.log('✅ Heure convertie (DD-MM-YYYY):', messekofferTime);
        } else {
          messekofferTime = rawTime;
          console.log('⚠️ Heure brute (non convertie):', messekofferTime);
        }
      }
    }
    
    res.json({ 
      datetime: new Date().toISOString(),
      messekoffer_datetime: messekofferTime
    });
  } catch (error) {
    console.error('❌ Erreur lecture:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYNCHRONISER L'HEURE ====================
app.post('/sync-time', async (req, res) => {
  console.log('🔄 Synchronisation demandée...');
  const { datetime } = req.body;
  
  if (!datetime) {
    return res.status(400).json({ error: 'datetime manquant' });
  }
  
  try {
    const pcDate = new Date(datetime);
    const Day = pcDate.getDate();
    const Month = pcDate.getMonth() + 1;
    const Year = pcDate.getFullYear();
    const Hour = pcDate.getHours();
    const Minute = pcDate.getMinutes();
    const Second = pcDate.getSeconds();
    const TimezoneOffset = -pcDate.getTimezoneOffset();
    const shortYear = String(Year).slice(-2);
    
    // Attention : Le Messekoffer attend le format MM/DD/YY pour l'envoi !
    const curtimeValue = `${Month}/${Day}/${shortYear} ${Hour}:${Minute}:${Second} ${TimezoneOffset}`;
    
    const setTimeUrl = `http://${MESSEKOPFER_IP}/set_sys_config.cgi?id=${MESSEKOPFER_ID}&sys=time&curtime=${encodeURIComponent(curtimeValue)}`;
    
    console.log('📤 Envoi (format MM/DD/YY):', curtimeValue);
    const response = await axios.get(setTimeUrl, { timeout: 10000 });
    
    console.log('✅ Réponse:', response.data);
    res.json({ status: 'ok', message: 'Synchronisation réussie' });
    
  } catch (error) {
    console.error('❌ Erreur synchro:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 4001;

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Serveur Zeit-Sync démarré');
  console.log('='.repeat(50));
  console.log(`📌 Port: ${PORT}`);
  console.log(`📌 Messekoffer IP: ${MESSEKOPFER_IP}`);
  console.log(`📌 Test ping: http://192.168.1.20:${PORT}/ping-messekoffer`);
  console.log('='.repeat(50) + '\n');
});