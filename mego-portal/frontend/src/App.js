import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Box, Container, Typography, Card, CardActionArea,
  Grid, AppBar, Toolbar, Button, Alert, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import TuneIcon from '@mui/icons-material/Tune';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import SecurityIcon from '@mui/icons-material/Security';
import BuildIcon from '@mui/icons-material/Build';
import RefreshIcon from '@mui/icons-material/Refresh';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';

const theme = createTheme({
  palette: {
    primary: { main: '#0a5e8c' },
    secondary: { main: '#e67e22' },
    success: { main: '#2c7a4d' },
    error: { main: '#d32f2f' }
  },
  shape: { borderRadius: 20 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
        }
      }
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          height: '100%'
        }
      }
    }
  }
});

// =================== LIENS ===================
const BACKEND_URL = 'http://192.168.1.20:4001';
const APP_URL = 'http://192.168.1.20:5000/';
const GRAFANA_URL = 'http://192.168.1.20:3000/d/adp8rnw/energie?orgId=1&from=now-30m&to=now&timezone=browser&var-Kanal=CH18&refresh=5s';
const CONFIG_URL = 'http://192.168.1.20:5000?view=config';
const ENERGY_URL = 'http://192.168.1.20:5000?view=energy';
// ✅ Vue Sensor-Bezeichnung développée dans l'app mego elle-même (App_20sensors.jsx)
const SENSOR_CONFIG_URL = 'http://192.168.1.20:5000?view=sensorconfig';
// ✅ Lien Mapping : accessible désormais depuis la carte "Kundendaten" sur la page principale
const MAPPING_URL = 'http://192.168.1.20:5000?view=mapping';
const DEFAULT_MESSEKOPFER_IP = '192.168.1.7';

// =================== HOOK POUR LE STATUT MESSEKOFFER ===================
const useMessekofferStatus = () => {
  const [isOnline, setIsOnline] = useState(null);
  const [checking, setChecking] = useState(true);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/ping-messekoffer`);
      const data = await response.json();
      setIsOnline(data.status === 'online');
    } catch (error) {
      setIsOnline(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, checking };
};

// =================== COMPOSANT STATUT MESSEKOFFER (NAVBAR) ===================
const MessekofferStatusNavbar = () => {
  const { isOnline, checking } = useMessekofferStatus();

  if (checking) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f5f5f5', px: 1.5, py: 0.5, borderRadius: 2 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">Connexion...</Typography>
      </Box>
    );
  }

  return (
    <Tooltip title={isOnline ? "Messekoffer erreichbar" : "Messekoffer nicht erreichbar - Netzwerk prüfen"}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.8, 
        bgcolor: isOnline ? '#e8f5e9' : '#ffebee',
        px: 1.5, 
        py: 0.5, 
        borderRadius: 3,
        border: `1px solid ${isOnline ? '#81c784' : '#ef9a9a'}`,
        transition: 'all 0.3s ease'
      }}>
        {isOnline ? (
          <WifiIcon sx={{ color: '#4caf50', fontSize: 18 }} />
        ) : (
          <WifiOffIcon sx={{ color: '#ef5350', fontSize: 18 }} />
        )}
        <Typography variant="caption" sx={{ fontWeight: 500, color: isOnline ? '#2e7d32' : '#c62828' }}>
          mE180 {isOnline ? 'Online' : 'Offline'}
        </Typography>
        <Box sx={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          bgcolor: isOnline ? '#4caf50' : '#ef5350',
          animation: isOnline ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.6, transform: 'scale(1.2)' },
            '100%': { opacity: 1, transform: 'scale(1)' }
          }
        }} />
      </Box>
    </Tooltip>
  );
};

// =================== TIME SYNC VIEW ===================
const TimeSyncView = () => {
  const [pcTime, setPcTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [loadingDeviceTime, setLoadingDeviceTime] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' });
  const [deviceTime, setDeviceTime] = useState(null);
  const [deviceTimeError, setDeviceTimeError] = useState('');
  const { isOnline: isMessekofferOnline } = useMessekofferStatus();

  useEffect(() => {
    const timer = setInterval(() => setPcTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDeviceTime = async (showSpinner = false) => {
    if (showSpinner) setLoadingDeviceTime(true);
    try {
      const response = await fetch(`${BACKEND_URL}/time`);
      if (response.ok) {
        const data = await response.json();
        if (data.messekoffer_datetime) {
          // Le backend envoie maintenant directement la date au format DD-MM-YYYY HH:MM:SS
          setDeviceTime(data.messekoffer_datetime);
        } else {
          setDeviceTime('--:--:--');
        }
        setDeviceTimeError('');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      setDeviceTimeError(`Fehler: ${error.message}`);
      setDeviceTime(null);
    } finally {
      if (showSpinner) setLoadingDeviceTime(false);
    }
  };

  useEffect(() => {
    fetchDeviceTime(true);
    const interval = setInterval(() => fetchDeviceTime(false), 3000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date) => {
    if (!date) return '--:--:--';
    return date.toLocaleString('de-DE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  };

  const handleSync = async () => {
    setLoading(true);
    setMessage({ text: '', severity: 'success' });
    try {
      const response = await fetch(`${BACKEND_URL}/sync-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datetime: pcTime.toISOString(), deviceIp: DEFAULT_MESSEKOPFER_IP })
      });
      if (response.ok) {
        setMessage({ text: '✅ Synchronisation erfolgreich!', severity: 'success' });
        setTimeout(() => fetchDeviceTime(true), 1000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: `❌ Fehler: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', severity: 'success' }), 5000);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e2a3a' }}>Zeitsynchronisation</Typography>
        <Typography variant="body1" sx={{ color: '#5a6e7c', mt: 1 }}>PC-Zeit mit dem Messekoffer abgleichen</Typography>
      </Box>

      <Grid container spacing={4} direction="column">
        <Grid item xs={12} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%', bgcolor: '#e8f5e9', p: 4, textAlign: 'center' }}>
            <AccessTimeIcon sx={{ fontSize: 56, color: '#0a5e8c', mb: 2 }} />
            <Typography variant="h6" fontWeight={600}>Aktuelle PC‑Zeit</Typography>
            <Typography variant="h4" sx={{ fontFamily: 'monospace', bgcolor: '#f8f9fa', py: 2, borderRadius: 2, mb: 2 }}>
              {formatDateTime(pcTime)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%', bgcolor: '#e8f5e9', p: 4, textAlign: 'center' }}>
            <PrecisionManufacturingIcon sx={{ fontSize: 56, color: '#e67e22', mb: 2 }} />
            <Typography variant="h6" fontWeight={600}>Uhrzeit des Messekoffers</Typography>
            {loadingDeviceTime ? (
              <CircularProgress size={40} sx={{ my: 2 }} />
            ) : deviceTimeError ? (
              <Alert severity="error">{deviceTimeError}</Alert>
            ) : (
              <Typography variant="h4" sx={{ fontFamily: 'monospace', bgcolor: '#f8f9fa', py: 2, borderRadius: 2, mb: 2, color: '#e67e22' }}>
                {deviceTime || '--:--:--'}
              </Typography>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchDeviceTime(true)} disabled={loadingDeviceTime} sx={{ borderRadius: 3 }}>
              Aktualisieren
            </Button>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 5, p: 4, bgcolor: '#ffffff', borderRadius: 4, boxShadow: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" fontWeight={600} sx={{ color: '#1e2a3a' }}>
              Netzwerkkonfiguration (Messekoffer)
            </Typography>
            {isMessekofferOnline !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: isMessekofferOnline ? '#4caf50' : '#ef5350',
                  animation: isMessekofferOnline ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.5, transform: 'scale(1.3)' },
                    '100%': { opacity: 1, transform: 'scale(1)' }
                  }
                }} />
                <Typography variant="caption" sx={{ 
                  fontWeight: 500, 
                  color: isMessekofferOnline ? '#4caf50' : '#ef5350'
                }}>
                  {isMessekofferOnline ? 'mE180 Online' : 'mE180 Offline'}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ 
            mt: 1.5, 
            borderBottom: `2px solid ${isMessekofferOnline === true ? '#4caf50' : isMessekofferOnline === false ? '#ef5350' : '#ddd'}`,
            width: '60px',
            transition: 'all 0.3s ease'
          }} />
        </Box>
        
        {isMessekofferOnline === true ? (
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleSync} 
            disabled={loading}
            startIcon={!loading && <RefreshIcon />}
            sx={{ 
              bgcolor: '#2c7a4d',
              borderRadius: 5,
              fontSize: '1rem',
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: '#1b5e2a',
                transform: 'scale(1.01)'
              }
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={22} sx={{ color: 'white' }} />
                <span>Synchronisiere...</span>
              </Box>
            ) : (
              '📡 PC-Zeit auf Messekoffer übertragen'
            )}
          </Button>
        ) : isMessekofferOnline === false ? (
          <Button 
            variant="contained" 
            fullWidth 
            disabled
            sx={{ 
              bgcolor: '#9e9e9e',
              borderRadius: 5,
              fontSize: '1rem',
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              cursor: 'not-allowed'
            }}
          >
            🔒 Synchronisation nicht möglich — Messekoffer offline
          </Button>
        ) : (
          <Button 
            variant="contained" 
            fullWidth 
            disabled
            sx={{ 
              bgcolor: '#9e9e9e',
              borderRadius: 5,
              fontSize: '1rem',
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            ⏳ Verbindung wird geprüft...
          </Button>
        )}
        
        {message.text && (
          <Alert severity={message.severity} sx={{ mt: 3, borderRadius: 3 }}>
            {message.text}
          </Alert>
        )}
      </Card>
    </Container>
  );
};

// =================== MAIN APP ===================
function App() {
  const [showEinstellungen, setShowEinstellungen] = useState(false);
  const [showTimeSync, setShowTimeSync] = useState(false);
  const [showLiveDaten, setShowLiveDaten] = useState(false);
  const [showKanalKonfiguration, setShowKanalKonfiguration] = useState(false);

  const handleBackToMain = () => {
    setShowEinstellungen(false);
    setShowTimeSync(false);
    setShowLiveDaten(false);
    setShowKanalKonfiguration(false);
  };

  const cards = [
    { title: 'Live Daten', desc: 'Live‑Stromdaten analysieren', icon: <AnalyticsIcon sx={{ fontSize: 64, color: theme.palette.primary.main }} />, url: null, action: () => setShowLiveDaten(true) },
    { title: 'Dashboard', desc: 'Grafana Dashboard', icon: <DashboardCustomizeIcon sx={{ fontSize: 64, color: theme.palette.secondary.main }} />, url: GRAFANA_URL, action: null },
    { title: 'Einstellungen', desc: 'Konfiguration & Synchronisation', icon: <TuneIcon sx={{ fontSize: 64, color: theme.palette.success.main }} />, url: null, action: () => setShowEinstellungen(true) }
  ];

  const featureIcons = [
    { icon: <SpeedIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />, title: 'Echtzeit-Monitoring', desc: 'Stromdaten in Millisekunden' },
    { icon: <PrecisionManufacturingIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />, title: 'Industrie-4.0-ready', desc: 'Präzise Messung & Analyse' },
    { icon: <CloudSyncIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />, title: 'Nahtlose Integration', desc: 'Grafana, REST-API, MQTT' },
    { icon: <SecurityIcon sx={{ fontSize: 48, color: theme.palette.error.main }} />, title: 'Sichere Lokale Instanz', desc: 'Daten verlassen nie das Netzwerk' }
  ];

  const mainView = (
    <Box sx={{ py: 6, position: 'relative', minHeight: '80vh' }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" fontWeight={800}>Willkommen im lokalen mE2go-Portal</Typography>
        <Typography variant="h5">Was wollen Sie machen?</Typography>
      </Box>
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 4, md: 6 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, mb: 6 }}>
          {featureIcons.map((item, idx) => (
            <Box key={idx} sx={{ textAlign: 'center' }}>
              {item.icon}
              <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {cards.map((card, idx) => (
            <Card key={idx} sx={{ cursor: 'pointer', bgcolor: '#e8f5e9', height: '100%' }} onClick={card.action || (() => window.location.href = card.url)}>
              <CardActionArea sx={{ p: 4, minHeight: 260, flexDirection: 'column' }}>
                {card.icon}
                <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>{card.title}</Typography>
                <Typography variant="body2" color="text.secondary">{card.desc}</Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon sx={{ fontSize: 20, color: '#5a7a9a' }} />
        <Typography variant="caption" sx={{ color: '#5a7a9a', fontWeight: 'bold' }}>.manageE CI</Typography>
      </Box>
    </Box>
  );

  const liveDatenView = (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" fontWeight={700}>Live Daten</Typography>
        <Typography variant="body1" sx={{ color: '#5a6e7c' }}>Wählen Sie den gewünschten Bereich.</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => window.location.href = APP_URL}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <AnalyticsIcon sx={{ fontSize: 72, color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight={700}>Daten verwalten</Typography>
            <Typography variant="body2" color="text.secondary">Live‑Stromdaten analysieren</Typography>
          </CardActionArea>
        </Card>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => window.location.href = MAPPING_URL}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <DeviceHubIcon sx={{ fontSize: 72, color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight={700}>Kundendaten</Typography>
            <Typography variant="body2" color="text.secondary">Sensor-Zuordnung verwalten</Typography>
          </CardActionArea>
        </Card>
      </Box>
    </Container>
  );

  const kanalKonfigurationView = (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" fontWeight={700}>Kanäle konfigurieren</Typography>
        <Typography variant="body1" sx={{ color: '#5a6e7c' }}>Wählen Sie den gewünschten Bereich.</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => window.location.href = CONFIG_URL}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <SettingsIcon sx={{ fontSize: 72, color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight={700}>Kanal Konfiguration</Typography>
            <Typography variant="body2" color="text.secondary">Parameter der Messkanäle anpassen</Typography>
          </CardActionArea>
        </Card>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => window.location.href = SENSOR_CONFIG_URL}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <DeviceHubIcon sx={{ fontSize: 72, color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight={700}>Sensor</Typography>
            <Typography variant="body2" color="text.secondary">Sensor-Bezeichnung verwalten</Typography>
          </CardActionArea>
        </Card>
      </Box>
    </Container>
  );

  const einstellungenView = (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" fontWeight={700}>Einstellungen & System</Typography>
        <Typography variant="body1" sx={{ color: '#5a6e7c' }}>Konfigurieren Sie Ihre Mess192.168.1.20 oder synchronisieren Sie die Systemzeit.</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', mb: 5 }}>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => setShowKanalKonfiguration(true)}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <SettingsIcon sx={{ fontSize: 72, color: theme.palette.primary.main }} />
            <Typography variant="h5" fontWeight={700}>Kanäle konfigurieren</Typography>
            <Typography variant="body2" color="text.secondary">Parameter der Messkanäle anpassen</Typography>
            <Typography variant="caption">Stromkanäle • Spannung • Frequenz • Grenzwerte</Typography>
          </CardActionArea>
        </Card>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => setShowTimeSync(true)}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <AccessTimeIcon sx={{ fontSize: 72, color: theme.palette.secondary.main }} />
            <Typography variant="h5" fontWeight={700}>Zeitsynchronisation</Typography>
            <Typography variant="body2" color="text.secondary">Uhrzeit zwischen Messekoffer und PC abgleichen</Typography>
          </CardActionArea>
        </Card>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: '#e8f5e9', cursor: 'pointer' }} onClick={() => window.location.href = ENERGY_URL}>
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <BatteryChargingFullIcon sx={{ fontSize: 72, color: theme.palette.success.main }} />
            <Typography variant="h5" fontWeight={700}>Kanal Zähler</Typography>
            <Typography variant="body2" color="text.secondary">Energie kumuliert & temporär verwalten</Typography>
            <Typography variant="caption">18 Kanäle • Energiewerte • Änderungshistorie</Typography>
          </CardActionArea>
        </Card>
      </Box>
      <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
        <Card sx={{ p: 4, bgcolor: '#ffffff', borderRadius: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={600}>ℹ️ Systeminformationen</Typography>
              <Box component="ul" sx={{ pl: 2, color: '#4a627a' }}>
                <li>mE2go Portal Version 2.1.0</li>
                <li>Grafana Dashboard: Live‑Daten & Historien</li>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={600}>🔧 Schnellhilfe</Typography>
              <Box component="ul" sx={{ pl: 2, color: '#4a627a' }}>
                <li><strong>Kanäle konfigurieren:</strong> Legen Sie Messbereiche, Skalierung und Einheiten fest.</li>
                <li><strong>Zeitsynchronisation:</strong> Stellen Sie sicher, dass PC und Messekoffer exakt dieselbe Uhrzeit haben.</li>
                <li><strong>Kanal Zähler:</strong> Verwalten Sie die kumulierten und temporären Energiewerte pro Kanal.</li>
                <li><strong>Support:</strong> Bei Problemen wenden Sie sich an Ihren Administrator.</li>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Container>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f5' }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #ddd' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box display="flex" alignItems="center" gap={1}>
              {(showEinstellungen || showTimeSync || showLiveDaten || showKanalKonfiguration) && <IconButton onClick={handleBackToMain}><ArrowBackIcon /></IconButton>}
              <Box component="img" src="/logo.png" alt="Logo" sx={{ height: 40, objectFit: 'contain' }} />
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6" fontWeight={700}>mE2go | Industrial Control</Typography>
              <MessekofferStatusNavbar />
            </Box>
          </Toolbar>
        </AppBar>
        {showTimeSync ? <TimeSyncView /> : showKanalKonfiguration ? kanalKonfigurationView : showLiveDaten ? liveDatenView : showEinstellungen ? einstellungenView : mainView}
      </Box>
    </ThemeProvider>
  );
}

export default App;