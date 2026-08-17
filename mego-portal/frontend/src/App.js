import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Box, Container, Typography, Card, CardActionArea,
  Grid, AppBar, Toolbar, Button, Alert, CircularProgress, IconButton, Tooltip, Chip
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SyncIcon from '@mui/icons-material/Sync';

// ── Design-Tokens (Enterprise / Industrie) ─────────────────────────────────
// Einheitliche Designsprache für das gesamte mE2go-Frontend (Portal +
// Erweiterung): neutrale Flächen, ein ruhiger Blauton als Marke, klare
// Statusfarben statt generischer Bunttöne.
const INK        = '#111827';
const INK_MUTED  = '#667085';
const SURFACE    = '#F3F5F7';
const PANEL      = '#FFFFFF';
const BORDER     = '#E3E6EB';
const SUCCESS    = '#1E8A5D';
const SUCCESS_BG = '#E7F5EE';
const DANGER     = '#C0392B';
const DANGER_BG  = '#FBEAE8';
const WARNING    = '#B7791F';
const WARNING_BG = '#FBF1DE';
const BRAND      = '#0a5e8c';
const BRAND_BG   = '#E9F2F7';
const ACCENT     = '#e67e22';
const ACCENT_BG  = '#FCEEE0';
const MONO_FONT    = '"IBM Plex Mono","JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const DISPLAY_FONT = '"IBM Plex Sans","Inter","Segoe UI", sans-serif';

const theme = createTheme({
  palette: {
    primary:   { main: BRAND },
    secondary: { main: ACCENT },
    success:   { main: SUCCESS },
    error:     { main: DANGER }
  },
  typography: {
    fontFamily: DISPLAY_FONT,
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${BORDER}`,
          boxShadow: 'none',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
          '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(17,24,39,0.08)', borderColor: '#D2D7DE' }
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
const GRAFANA_URL = 'http://localhost:3000/d/adrxt9v/energie?orgId=1&from=now-30m&to=now&timezone=browser&var-Kanal=CH1%20a&refresh=5s';
const CONFIG_URL = 'http://192.168.1.20:5000?view=config';
const ENERGY_URL = 'http://192.168.1.20:5000?view=energy';
// ✅ Vue Sensor-Bezeichnung développée dans l'app mego elle-même (App_20sensors.jsx)
const SENSOR_CONFIG_URL = 'http://192.168.1.20:5000?view=sensorconfig';
// ✅ Lien Mapping : accessible depuis la carte "Kundendaten" sur la page "Live Daten"
const MAPPING_URL = 'http://192.168.1.20:5000?view=mapping';
const DEFAULT_MESSEKOFFER_IP = '192.168.1.7';

// ✅ Fréquence de lecture de l'heure du Messkoffer : chaque seconde, pour un
// affichage vraiment "temps réel" en regard de l'horloge PC.
const DEVICE_TIME_POLL_MS = 1000;

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: SURFACE, px: 1.5, py: 0.6, borderRadius: 20, border: `1px solid ${BORDER}` }}>
        <CircularProgress size={13} sx={{ color: INK_MUTED }} />
        <Typography variant="caption" sx={{ color: INK_MUTED, fontWeight: 500 }}>Verbindung…</Typography>
      </Box>
    );
  }

  return (
    <Tooltip title={isOnline ? 'Messekoffer erreichbar' : 'Messekoffer nicht erreichbar - Netzwerk prüfen'}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.8,
        bgcolor: isOnline ? SUCCESS_BG : DANGER_BG,
        px: 1.5,
        py: 0.6,
        borderRadius: 20,
        border: `1px solid ${isOnline ? '#BFE3D2' : '#F3C9C4'}`,
        transition: 'all 0.3s ease'
      }}>
        {isOnline ? (
          <WifiIcon sx={{ color: SUCCESS, fontSize: 17 }} />
        ) : (
          <WifiOffIcon sx={{ color: DANGER, fontSize: 17 }} />
        )}
        <Typography variant="caption" sx={{ fontWeight: 700, color: isOnline ? SUCCESS : DANGER, letterSpacing: '0.2px' }}>
          mE180 {isOnline ? 'Online' : 'Offline'}
        </Typography>
        <Box sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: isOnline ? SUCCESS : DANGER,
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

// =================== HELPER: PARSE "DD-MM-YYYY HH:MM:SS" ===================
const parseDeviceTimeString = (str) => {
  if (!str) return null;
  const m = str.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
};

// =================== TIME SYNC VIEW ===================
const TimeSyncView = ({ onBack }) => {
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
          setDeviceTime(data.messekoffer_datetime);
        } else {
          setDeviceTime(null);
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
    const interval = setInterval(() => fetchDeviceTime(false), DEVICE_TIME_POLL_MS);
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
        body: JSON.stringify({ datetime: pcTime.toISOString(), deviceIp: DEFAULT_MESSEKOFFER_IP })
      });
      if (response.ok) {
        setMessage({ text: 'Synchronisation erfolgreich abgeschlossen.', severity: 'success' });
        setTimeout(() => fetchDeviceTime(true), 1000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: `Synchronisation fehlgeschlagen: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', severity: 'success' }), 5000);
    }
  };

  const parsedDeviceDate = parseDeviceTimeString(deviceTime);
  const diffSeconds = parsedDeviceDate ? Math.round((pcTime.getTime() - parsedDeviceDate.getTime()) / 1000) : null;
  const absDiff = diffSeconds !== null ? Math.abs(diffSeconds) : null;

  let diffStatus = 'unknown';
  if (absDiff !== null) {
    if (absDiff <= 1) diffStatus = 'inSync';
    else if (absDiff <= 5) diffStatus = 'minor';
    else diffStatus = 'outOfSync';
  }

  const diffColor = { inSync: SUCCESS, minor: WARNING, outOfSync: DANGER, unknown: INK_MUTED }[diffStatus];
  const diffBg = { inSync: SUCCESS_BG, minor: WARNING_BG, outOfSync: DANGER_BG, unknown: SURFACE }[diffStatus];
  const diffLabel = diffStatus === 'unknown'
    ? 'Kein Vergleich möglich'
    : diffStatus === 'inSync'
      ? 'Synchron'
      : `${diffSeconds > 0 ? '+' : ''}${diffSeconds}\u00A0s Abweichung`;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ color: INK, border: `1px solid ${BORDER}`, bgcolor: PANEL }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ color: INK }}>Zeitsynchronisation</Typography>
          <Typography variant="body2" sx={{ color: INK_MUTED }}>PC-Zeit mit dem Messekoffer abgleichen</Typography>
        </Box>
      </Box>

      {/* ── Karte 1: PC-Zeit (Referenz) ───────────────────────────────────── */}
      <Card sx={{ overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, bgcolor: BRAND }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 3, md: 4 }, py: 2.5, pl: { xs: 4, md: 4.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
            <Box sx={{ display: 'inline-flex', width: 40, height: 40, borderRadius: '10px', bgcolor: BRAND_BG, alignItems: 'center', justifyContent: 'center' }}>
              <AccessTimeIcon sx={{ fontSize: 22, color: BRAND }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ color: INK, fontWeight: 700, lineHeight: 1.2 }}>Aktuelle PC-Zeit</Typography>
              <Typography variant="caption" sx={{ color: INK_MUTED }}>Referenzquelle für den Abgleich</Typography>
            </Box>
          </Box>
          <Chip size="small" label="Lokal" sx={{ bgcolor: BRAND_BG, color: BRAND, fontWeight: 700, fontSize: '0.7rem' }} />
        </Box>
        <Box sx={{
          mx: { xs: 3, md: 4 }, mb: 3, ml: { xs: 4, md: 4.5 },
          bgcolor: '#0d141b', borderRadius: 2, py: 2.6, textAlign: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)'
        }}>
          <Typography sx={{
            fontFamily: MONO_FONT, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' },
            color: '#7CC7E8', letterSpacing: '1.5px'
          }}>
            {formatDateTime(pcTime)}
          </Typography>
        </Box>
      </Card>

      {/* ── Differenz-Konnektor ───────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: -1, position: 'relative', zIndex: 1 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, bgcolor: diffBg, border: `1px solid ${BORDER}`,
          borderRadius: 20, px: 2, py: 0.7, boxShadow: '0 2px 6px rgba(17,24,39,0.06)'
        }}>
          <SyncIcon sx={{ fontSize: 17, color: diffColor }} />
          <Typography variant="caption" sx={{ fontFamily: MONO_FONT, fontWeight: 700, color: diffColor }}>
            {diffLabel}
          </Typography>
        </Box>
      </Box>

      {/* ── Karte 2: Messkoffer-Zeit ───────────────────────────────────────── */}
      <Card sx={{ overflow: 'hidden', position: 'relative', mt: 3 }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, bgcolor: ACCENT }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 3, md: 4 }, py: 2.5, pl: { xs: 4, md: 4.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
            <Box sx={{ display: 'inline-flex', width: 40, height: 40, borderRadius: '10px', bgcolor: ACCENT_BG, alignItems: 'center', justifyContent: 'center' }}>
              <PrecisionManufacturingIcon sx={{ fontSize: 22, color: ACCENT }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ color: INK, fontWeight: 700, lineHeight: 1.2 }}>Uhrzeit des Messekoffers</Typography>
              <Typography variant="caption" sx={{ color: INK_MUTED, fontFamily: MONO_FONT }}>mE180 · {DEFAULT_MESSEKOFFER_IP}</Typography>
            </Box>
          </Box>
          {isMessekofferOnline !== null && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.7, bgcolor: isMessekofferOnline ? SUCCESS_BG : DANGER_BG,
              px: 1.3, py: 0.45, borderRadius: 20
            }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: isMessekofferOnline ? SUCCESS : DANGER,
                animation: isMessekofferOnline ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.5, transform: 'scale(1.3)' },
                  '100%': { opacity: 1, transform: 'scale(1)' }
                }
              }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: isMessekofferOnline ? SUCCESS : DANGER, fontSize: '0.72rem' }}>
                {isMessekofferOnline ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{
          mx: { xs: 3, md: 4 }, mb: 2, ml: { xs: 4, md: 4.5 },
          bgcolor: '#0d141b', borderRadius: 2, py: 2.6, textAlign: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)'
        }}>
          {loadingDeviceTime ? (
            <CircularProgress size={26} sx={{ color: ACCENT }} />
          ) : deviceTimeError ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
              <WifiOffIcon sx={{ fontSize: 20, color: '#E17B6B' }} />
              <Typography variant="body2" sx={{ color: '#E17B6B', fontWeight: 600 }}>Nicht erreichbar</Typography>
            </Box>
          ) : (
            <Typography sx={{
              fontFamily: MONO_FONT, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' },
              color: '#F0B27A', letterSpacing: '1.5px'
            }}>
              {deviceTime || '--:--:--'}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 3, md: 4 }, pb: 2.5, ml: { xs: 1, md: 0.5 } }}>
          <Chip
            size="small"
            icon={<SyncIcon sx={{ fontSize: '13px !important' }} />}
            label="Aktualisierung jede Sekunde"
            sx={{ bgcolor: SURFACE, color: INK_MUTED, fontWeight: 600, fontSize: '0.7rem' }}
          />
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => fetchDeviceTime(true)} disabled={loadingDeviceTime}
            sx={{ borderRadius: 20, textTransform: 'none', borderColor: BORDER, color: INK, fontSize: '0.78rem' }}>
            Jetzt aktualisieren
          </Button>
        </Box>
      </Card>

      {/* ── Karte 3: Synchronisation ───────────────────────────────────────── */}
      <Card sx={{ mt: 4, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 3, md: 4 }, py: 2.5, borderBottom: `1px solid ${BORDER}`, bgcolor: SURFACE }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <CloudSyncIcon sx={{ fontSize: 19, color: SUCCESS }} />
            <Typography variant="subtitle1" sx={{ color: INK, fontWeight: 700 }}>Synchronisation</Typography>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 3, md: 4 }, py: 3.5 }}>
          {isMessekofferOnline === true ? (
            <Button
              variant="contained"
              fullWidth
              onClick={handleSync}
              disabled={loading}
              startIcon={!loading && <RefreshIcon />}
              sx={{
                bgcolor: SUCCESS, borderRadius: 20, fontSize: '1rem', py: 1.5,
                textTransform: 'none', fontWeight: 700, boxShadow: 'none',
                '&:hover': { bgcolor: '#166B48', boxShadow: 'none' }
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  <span>Synchronisiere…</span>
                </Box>
              ) : (
                'PC-Zeit auf Messekoffer übertragen'
              )}
            </Button>
          ) : isMessekofferOnline === false ? (
            <Button variant="contained" fullWidth disabled sx={{
              bgcolor: BORDER, color: INK_MUTED, borderRadius: 20, fontSize: '1rem', py: 1.5,
              textTransform: 'none', fontWeight: 700, boxShadow: 'none', cursor: 'not-allowed'
            }}>
              Synchronisation nicht möglich — Messekoffer offline
            </Button>
          ) : (
            <Button variant="contained" fullWidth disabled sx={{
              bgcolor: BORDER, color: INK_MUTED, borderRadius: 20, fontSize: '1rem', py: 1.5,
              textTransform: 'none', fontWeight: 700, boxShadow: 'none'
            }}>
              Verbindung wird geprüft…
            </Button>
          )}

          {message.text && (
            <Alert severity={message.severity} sx={{ mt: 2.5, borderRadius: 2 }}>
              {message.text}
            </Alert>
          )}
        </Box>
      </Card>
    </Container>
  );
};

// =================== BAUSTEIN: ÜBERSCHRIFT MIT ZURÜCK-BUTTON ===================
const SectionHeader = ({ title, subtitle, onBack }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center', position: 'relative' }}>
    {onBack && (
      <IconButton onClick={onBack} sx={{ color: INK, border: `1px solid ${BORDER}`, bgcolor: PANEL, position: 'absolute', left: 0 }}>
        <ArrowBackIcon />
      </IconButton>
    )}
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" sx={{ color: INK }}>{title}</Typography>
      {subtitle && <Typography variant="body1" sx={{ color: INK_MUTED, mt: 0.5 }}>{subtitle}</Typography>}
    </Box>
  </Box>
);

// =================== BAUSTEIN: NAVIGATIONSKARTE (ROLLKARTE) ===================
const NavCard = ({ icon, iconBg, accent, title, desc, footnote, onClick, width }) => (
  <Card sx={{ width: width || { xs: '100%', sm: '320px', md: '360px' }, bgcolor: PANEL, cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={onClick}>
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: accent }} />
    <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
      <Box sx={{ display: 'inline-flex', width: 84, height: 84, borderRadius: '50%', bgcolor: iconBg, alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h5" sx={{ color: INK }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: INK_MUTED, mt: 0.5 }}>{desc}</Typography>
      {footnote && <Typography variant="caption" sx={{ color: INK_MUTED, display: 'block', mt: 1 }}>{footnote}</Typography>}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 2, color: accent, fontWeight: 700, fontSize: '0.8rem' }}>
        Öffnen <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </Box>
    </CardActionArea>
  </Card>
);

// =================== BAUSTEIN: INFO-KARTE (2 SPALTEN) ===================
const InfoCard = ({ leftIcon, leftTitle, leftColor, leftContent, rightIcon, rightTitle, rightColor, rightContent }) => (
  <Box sx={{ maxWidth: '900px', mx: 'auto', mt: 5 }}>
    <Card sx={{ p: 4, bgcolor: PANEL }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {React.cloneElement(leftIcon, { sx: { color: leftColor, fontSize: 20 } })}
            <Typography variant="h6" sx={{ color: INK }}>{leftTitle}</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: INK_MUTED }}>{leftContent}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {React.cloneElement(rightIcon, { sx: { color: rightColor, fontSize: 20 } })}
            <Typography variant="h6" sx={{ color: INK }}>{rightTitle}</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: INK_MUTED }}>{rightContent}</Typography>
        </Grid>
      </Grid>
    </Card>
  </Box>
);

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

  const handleBackToEinstellungen = () => {
    setShowTimeSync(false);
    setShowKanalKonfiguration(false);
  };

  const cards = [
    {
      title: 'Live Daten', desc: 'Live-Stromdaten analysieren',
      icon: <AnalyticsIcon sx={{ fontSize: 44, color: BRAND }} />, iconBg: BRAND_BG, accent: BRAND,
      action: () => setShowLiveDaten(true)
    },
    {
      title: 'Dashboard', desc: 'Grafana Dashboard',
      icon: <DashboardCustomizeIcon sx={{ fontSize: 44, color: ACCENT }} />, iconBg: ACCENT_BG, accent: ACCENT,
      action: () => window.location.href = GRAFANA_URL
    },
    {
      title: 'Einstellungen', desc: 'Konfiguration & Synchronisation',
      icon: <TuneIcon sx={{ fontSize: 44, color: SUCCESS }} />, iconBg: SUCCESS_BG, accent: SUCCESS,
      action: () => setShowEinstellungen(true)
    }
  ];

  const featureIcons = [
    { icon: <SpeedIcon sx={{ fontSize: 30, color: BRAND }} />, bg: BRAND_BG, title: 'Echtzeit-Monitoring', desc: 'Stromdaten in Millisekunden' },
    { icon: <PrecisionManufacturingIcon sx={{ fontSize: 30, color: ACCENT }} />, bg: ACCENT_BG, title: 'Industrie-4.0-ready', desc: 'Präzise Messung & Analyse' },
    { icon: <CloudSyncIcon sx={{ fontSize: 30, color: SUCCESS }} />, bg: SUCCESS_BG, title: 'Nahtlose Integration', desc: 'Grafana, REST-API, MQTT' },
    { icon: <SecurityIcon sx={{ fontSize: 30, color: DANGER }} />, bg: DANGER_BG, title: 'Sichere lokale Instanz', desc: 'Daten verlassen nie das Netzwerk' }
  ];

  // ── Hauptseite ────────────────────────────────────────────────────────────
  const mainView = (
    <Box sx={{ py: 6, position: 'relative', minHeight: '80vh' }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" sx={{ color: INK }}>Willkommen im lokalen mE2go-Portal</Typography>
        <Typography variant="h6" sx={{ color: INK_MUTED, fontWeight: 500, mt: 0.5 }}>Was wollen Sie machen?</Typography>
      </Box>
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 4, md: 6 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 6 }}>
          {featureIcons.map((item, idx) => (
            <Box key={idx} sx={{ textAlign: 'center', p: 2.5, borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: PANEL }}>
              <Box sx={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', bgcolor: item.bg, alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                {item.icon}
              </Box>
              <Typography variant="body2" sx={{ color: INK, fontWeight: 700 }}>{item.title}</Typography>
              <Typography variant="caption" sx={{ color: INK_MUTED }}>{item.desc}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {cards.map((card, idx) => (
            <NavCard key={idx} icon={card.icon} iconBg={card.iconBg} accent={card.accent}
              title={card.title} desc={card.desc} onClick={card.action} width="100%" />
          ))}
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon sx={{ fontSize: 18, color: INK_MUTED }} />
        <Typography variant="caption" sx={{ color: INK_MUTED, fontWeight: 700 }}>.manageE CI</Typography>
      </Box>
    </Box>
  );

  // ── Live Daten ────────────────────────────────────────────────────────────
  const liveDatenView = (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <SectionHeader title="Live Daten" subtitle="Wählen Sie den gewünschten Bereich." />
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <NavCard
          icon={<AnalyticsIcon sx={{ fontSize: 40, color: BRAND }} />} iconBg={BRAND_BG} accent={BRAND}
          title="Daten verwalten" desc="Live-Stromdaten analysieren"
          onClick={() => window.location.href = APP_URL}
        />
        <NavCard
          icon={<DeviceHubIcon sx={{ fontSize: 40, color: BRAND }} />} iconBg={BRAND_BG} accent={BRAND}
          title="Kundendaten" desc="Sensor-Zuordnung verwalten"
          onClick={() => window.location.href = MAPPING_URL}
        />
      </Box>
      <InfoCard
        leftIcon={<SpeedIcon />} leftTitle="Daten verwalten" leftColor={BRAND}
        leftContent="Greifen Sie in Echtzeit auf alle Messkanäle zu: Strom, Wirkleistung, Spannung und Energie werden kontinuierlich erfasst und live dargestellt — für eine präzise Überwachung Ihrer industriellen Anlage."
        rightIcon={<DeviceHubIcon />} rightTitle="Kundendaten" rightColor={BRAND}
        rightContent="Behalten Sie die Zuordnung Ihrer Sensoren im Blick: jeder Sensor und seine Kanäle werden übersichtlich dargestellt — für eine klare Nachverfolgung Ihrer Messpunkte."
      />
    </Container>
  );

  // ── Kanäle konfigurieren ──────────────────────────────────────────────────
  const kanalKonfigurationView = (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <SectionHeader title="Kanäle konfigurieren" subtitle="Wählen Sie den gewünschten Bereich." />
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <NavCard
          icon={<SettingsIcon sx={{ fontSize: 40, color: BRAND }} />} iconBg={BRAND_BG} accent={BRAND}
          title="Kanal Konfiguration" desc="Parameter der Messkanäle anpassen"
          onClick={() => window.location.href = CONFIG_URL}
        />
        <NavCard
          icon={<DeviceHubIcon sx={{ fontSize: 40, color: BRAND }} />} iconBg={BRAND_BG} accent={BRAND}
          title="Sensor" desc="Sensor-Bezeichnung verwalten"
          onClick={() => window.location.href = SENSOR_CONFIG_URL}
        />
      </Box>
      <InfoCard
        leftIcon={<SettingsIcon />} leftTitle="Kanal Konfiguration" leftColor={BRAND}
        leftContent="Definieren Sie die technischen Parameter jedes Messkanals: Bezeichnung, Schwellwert und Höchstwert lassen sich individuell anpassen — für eine präzise und zuverlässige Messgenauigkeit Ihrer Anlage."
        rightIcon={<DeviceHubIcon />} rightTitle="Sensor" rightColor={BRAND}
        rightContent="Vergeben Sie eine kundenspezifische Bezeichnung für jeden Sensor und Kanal — für eine klare, verständliche Kennzeichnung in Ihrer Kundendokumentation."
      />
    </Container>
  );

  // ── Einstellungen ─────────────────────────────────────────────────────────
  const einstellungenView = (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <SectionHeader title="Einstellungen & System" subtitle="Konfigurieren Sie Ihre Messkoffer oder synchronisieren Sie die Systemzeit." />
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', mb: 5 }}>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: PANEL, cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => setShowKanalKonfiguration(true)}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: BRAND }} />
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', width: 88, height: 88, borderRadius: '50%', bgcolor: BRAND_BG, alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <SettingsIcon sx={{ fontSize: 46, color: BRAND }} />
            </Box>
            <Typography variant="h5" sx={{ color: INK }}>Kanäle konfigurieren</Typography>
            <Typography variant="body2" sx={{ color: INK_MUTED, mt: 0.5 }}>Parameter der Messkanäle anpassen</Typography>
            <Typography variant="caption" sx={{ color: INK_MUTED, display: 'block', mt: 1 }}>Stromkanäle · Spannung · Frequenz · Grenzwerte</Typography>
          </CardActionArea>
        </Card>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: PANEL, cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => setShowTimeSync(true)}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: ACCENT }} />
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', width: 88, height: 88, borderRadius: '50%', bgcolor: ACCENT_BG, alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <AccessTimeIcon sx={{ fontSize: 46, color: ACCENT }} />
            </Box>
            <Typography variant="h5" sx={{ color: INK }}>Zeitsynchronisation</Typography>
            <Typography variant="body2" sx={{ color: INK_MUTED, mt: 0.5 }}>Uhrzeit zwischen Messekoffer und PC abgleichen</Typography>
          </CardActionArea>
        </Card>
        <Card sx={{ width: { xs: '100%', sm: '320px', md: '360px' }, bgcolor: PANEL, cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => window.location.href = ENERGY_URL}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: SUCCESS }} />
          <CardActionArea sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', width: 88, height: 88, borderRadius: '50%', bgcolor: SUCCESS_BG, alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <BatteryChargingFullIcon sx={{ fontSize: 46, color: SUCCESS }} />
            </Box>
            <Typography variant="h5" sx={{ color: INK }}>Kanal Zähler</Typography>
            <Typography variant="body2" sx={{ color: INK_MUTED, mt: 0.5 }}>Energie kumuliert & temporär verwalten</Typography>
            <Typography variant="caption" sx={{ color: INK_MUTED, display: 'block', mt: 1 }}>18 Kanäle · Energiewerte · Änderungshistorie</Typography>
          </CardActionArea>
        </Card>
      </Box>
      <InfoCard
        leftIcon={<InfoOutlinedIcon />} leftTitle="Systeminformationen" leftColor={BRAND}
        leftContent={
          <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
            <li>mE2go Portal Version 2.1.0</li>
            <li>Grafana Dashboard: Live-Daten &amp; Historien</li>
          </Box>
        }
        rightIcon={<HelpOutlineIcon />} rightTitle="Schnellhilfe" rightColor={ACCENT}
        rightContent={
          <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
            <li><strong style={{ color: INK }}>Kanäle konfigurieren:</strong> Legen Sie Messbereiche, Skalierung und Einheiten fest.</li>
            <li><strong style={{ color: INK }}>Zeitsynchronisation:</strong> Stellen Sie sicher, dass PC und Messekoffer exakt dieselbe Uhrzeit haben.</li>
            <li><strong style={{ color: INK }}>Kanal Zähler:</strong> Verwalten Sie die kumulierten und temporären Energiewerte pro Kanal.</li>
            <li><strong style={{ color: INK }}>Support:</strong> Bei Problemen wenden Sie sich an Ihren Administrator.</li>
          </Box>
        }
      />
    </Container>
  );

  const anySubView = showEinstellungen || showTimeSync || showLiveDaten || showKanalKonfiguration;

  const currentBack = showTimeSync || showKanalKonfiguration ? handleBackToEinstellungen : handleBackToMain;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: SURFACE }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: PANEL, borderBottom: `1px solid ${BORDER}` }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box display="flex" alignItems="center" gap={1}>
              {anySubView && !showTimeSync && (
                <IconButton onClick={currentBack} sx={{ color: INK }}><ArrowBackIcon /></IconButton>
              )}
              <Box component="img" src="/logo.png" alt="Logo" sx={{ height: 36, objectFit: 'contain' }} />
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6" sx={{ color: INK, fontSize: '1.05rem' }}>mE2go | Industrial Control</Typography>
              <MessekofferStatusNavbar />
            </Box>
          </Toolbar>
        </AppBar>
        {showTimeSync
          ? <TimeSyncView onBack={handleBackToEinstellungen} />
          : showKanalKonfiguration
            ? kanalKonfigurationView
            : showLiveDaten
              ? liveDatenView
              : showEinstellungen
                ? einstellungenView
                : mainView}
      </Box>
    </ThemeProvider>
  );
}

export default App;