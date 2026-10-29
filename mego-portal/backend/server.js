const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== CONTRÔLEURS mE180 ====================
// Controller 1 : 10.0.5.233 (ID 51105)
// Controller 2 : 10.0.5.234 (ID à définir dans le .env : MESSE_ID_2)
// Le contrôleur 2 n'est activé que si MESSE_ID_2 est défini.
const CONTROLLERS = {};

function addController(num, ip, id, device, label) {
  if (!ip || !id) return;
  CONTROLLERS[num] = { num, ip, id, device, label: label || `Controller ${num}` };
}

addController('1', process.env.MESSE_IP   || '10.0.5.233', process.env.MESSE_ID   || 51105, process.env.MEGO4_DEVICE   || 'mE180',   process.env.MESSE_LABEL);
addController('2', process.env.MESSE_IP_2 || '10.0.5.234', process.env.MESSE_ID_2 || 51105, process.env.MEGO4_DEVICE_2 || 'mE180_2', process.env.MESSE_LABEL_2);

// Retrouve le contrôleur demandé (?controller=1|2 ou dans le body). Par défaut : 1.
function getCtrl(req, res) {
  const num  = String(req.query.controller || req.body?.controller || '1');
  const ctrl = CONTROLLERS[num];
  if (!ctrl) {
    res.status(400).json({ error: `Unbekannter Controller: ${num}` });
    return null;
  }
  return ctrl;
}

// ==================== FUSEAU HORAIRE ====================
// Offset au format JS getTimezoneOffset() : -60 en hiver (CET), -120 en été (CEST).
// Calculé pour Europe/Berlin quel que soit le fuseau du serveur (souvent UTC).
// Changement heure d'été / hiver géré automatiquement.
const TIMEZONE = process.env.TIMEZONE || 'Europe/Berlin';

function getZoneOffset(date = new Date(), timeZone = TIMEZONE) {
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  const utc   = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((utc - local) / 60000); // ex. -60 en hiver, -120 en été
}

// Priorité : ?tz= envoyé par le navigateur, sinon offset Europe/Berlin.
function getTzOffset(req) {
  const tz = parseInt(req.query.tz ?? req.body?.tz, 10);
  return Number.isFinite(tz) ? tz : getZoneOffset();
}

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ==================== LISTE DES CONTRÔLEURS ====================
app.get('/controllers', (req, res) => {
  res.json(Object.values(CONTROLLERS).map(c => ({ num: c.num, label: c.label, ip: c.ip, device: c.device })));
});

// ==================== PING MESSEKOFFER ====================
app.get('/ping-messekoffer', async (req, res) => {
  const ctrl = getCtrl(req, res); if (!ctrl) return;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${ctrl.ip}/get_sys_config.cgi?id=${ctrl.id}&sys=time&TimezoneOffset=${getTzOffset(req)}`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    res.json({ controller: ctrl.num, status: response.ok ? 'online' : 'offline' });
  } catch (error) {
    console.log(`❌ ${ctrl.label} nicht erreichbar:`, error.message);
    res.json({ controller: ctrl.num, status: 'offline', error: error.message });
  }
});

// Test endpoint
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// ==================== LIRE L'HEURE (FORMAT JJ-MM-AAAA) ====================
app.get('/time', async (req, res) => {
  const ctrl = getCtrl(req, res); if (!ctrl) return;
  try {
    const tzOffset = getTzOffset(req);
    const url = `http://${ctrl.ip}/get_sys_config.cgi?id=${ctrl.id}&sys=time&TimezoneOffset=${tzOffset}`;
    const response = await axios.get(url, { timeout: 5000 });

    let messekofferTime = null;
    if (response.data && typeof response.data === 'string') {
      const match = response.data.match(/curtime=([^\n]+)/);
      if (match) {
        const rawTime = match[1];
        // MM/DD/YY HH:MM:SS -> DD-MM-YYYY HH:MM:SS
        const parts = rawTime.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        messekofferTime = parts
          ? `${parts[2]}-${parts[1]}-20${parts[3]} ${parts[4]}:${parts[5]}:${parts[6]}`
          : rawTime;
      }
    }

    res.json({
      controller: ctrl.num,
      datetime: new Date().toISOString(),
      messekoffer_datetime: messekofferTime,
      timezone_offset: tzOffset
    });
  } catch (error) {
    console.error(`❌ ${ctrl.label} Erreur lecture:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYNCHRONISER L'HEURE ====================
app.post('/sync-time', async (req, res) => {
  const ctrl = getCtrl(req, res); if (!ctrl) return;
  const { datetime } = req.body;

  if (!datetime) {
    return res.status(400).json({ error: 'datetime manquant' });
  }

  try {
    const pcDate = new Date(datetime);
    const TimezoneOffset = -pcDate.getTimezoneOffset();
    const shortYear = String(pcDate.getFullYear()).slice(-2);

    // Le Messekoffer attend le format MM/DD/YY pour l'envoi
    const curtimeValue = `${pcDate.getMonth() + 1}/${pcDate.getDate()}/${shortYear} ${pcDate.getHours()}:${pcDate.getMinutes()}:${pcDate.getSeconds()} ${TimezoneOffset}`;
    const setTimeUrl = `http://${ctrl.ip}/set_sys_config.cgi?id=${ctrl.id}&sys=time&curtime=${encodeURIComponent(curtimeValue)}`;

    console.log(` ${ctrl.label} – Envoi (MM/DD/YY):`, curtimeValue);
    await axios.get(setTimeUrl, { timeout: 10000 });

    res.json({ status: 'ok', controller: ctrl.num, message: 'Synchronisation réussie' });
  } catch (error) {
    console.error(`❌ ${ctrl.label} Erreur synchro:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 4001;

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log(' Serveur Zeit-Sync démarré');
  console.log('='.repeat(50));
  console.log(` Port: ${PORT}`);
  console.log(` Fuseau: ${TIMEZONE} → TimezoneOffset=${getZoneOffset()} (serveur: ${new Date().getTimezoneOffset()})`);
  Object.values(CONTROLLERS).forEach(c => console.log(` ${c.label}: ${c.ip} (ID ${c.id})`));
  if (!CONTROLLERS['2']) console.log(' Controller 2: deaktiviert (MESSE_ID_2 fehlt im .env)');
  console.log('='.repeat(50) + '\n');
});