import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cctv, 
  Video, 
  Wifi, 
  Server, 
  MapPin, 
  Shield, 
  Radar, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Sliders, 
  Cpu, 
  Lock, 
  Globe, 
  Compass,
  Zap
} from 'lucide-react';
import type { Camera, CreateCameraData } from '../../services/cameras';
import { cameraService } from '../../services/cameras';
import { authService } from '../../services/auth';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (camera: Camera) => void;
  cameraToEdit?: Camera | null;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cameraToEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'stream' | 'location' | 'settings'>('stream');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [model, setModel] = useState('Dahua / Hikvision IP CAM');
  const [protocol, setProtocol] = useState<'rtsp' | 'webrtc' | 'hls' | 'http'>('rtsp');
  const [streamUrl, setStreamUrl] = useState('');
  const [customUrlMode, setCustomUrlMode] = useState(false);

  // RTSP Helper Fields
  const [rtspIp, setRtspIp] = useState('10.239.254.223');
  const [rtspPort, setRtspPort] = useState('554');
  const [rtspPath, setRtspPath] = useState('/stream');
  const [rtspUser, setRtspUser] = useState('');
  const [rtspPass, setRtspPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Location & Coverage
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('4.6097');
  const [longitude, setLongitude] = useState('-74.0817');
  const [coverageRadius, setCoverageRadius] = useState(100);
  const [zone, setZone] = useState('Sector Centro');

  // Policy & AI
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const [aiDetection, setAiDetection] = useState(true);
  const [resolution, setResolution] = useState('1080p (Full HD)');

  // Auto-build stream URL from parts when not in custom URL mode
  useEffect(() => {
    if (!customUrlMode) {
      if (protocol === 'rtsp') {
        const authPart = rtspUser ? `${encodeURIComponent(rtspUser)}:${encodeURIComponent(rtspPass)}@` : '';
        const portPart = rtspPort && rtspPort !== '554' ? `:${rtspPort}` : '';
        const cleanPath = rtspPath.startsWith('/') ? rtspPath : `/${rtspPath}`;
        setStreamUrl(`rtsp://${authPart}${rtspIp || '127.0.0.1'}${portPart}${cleanPath}`);
      } else if (protocol === 'webrtc') {
        setStreamUrl(`http://${rtspIp || 'localhost'}:8889/${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cam1'}`);
      } else if (protocol === 'hls') {
        setStreamUrl(`http://${rtspIp || 'localhost'}:8888/${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cam1'}/index.m3u8`);
      } else {
        setStreamUrl(`http://${rtspIp || 'localhost'}:8080/video`);
      }
    }
  }, [protocol, rtspIp, rtspPort, rtspPath, rtspUser, rtspPass, customUrlMode, name]);

  // Load camera to edit
  useEffect(() => {
    if (cameraToEdit) {
      setName(cameraToEdit.name);
      setAddress(cameraToEdit.location?.address || '');
      setLatitude(String(cameraToEdit.location?.latitude || 4.6097));
      setLongitude(String(cameraToEdit.location?.longitude || -74.0817));
      setCoverageRadius(cameraToEdit.coverageRadius || 100);
      setIsPublic(cameraToEdit.isPublic ?? true);
      setStatus((cameraToEdit.status as any) || 'online');
      setStreamUrl(cameraToEdit.streamUrl || '');
      setCustomUrlMode(true);
    } else {
      // Default reset
      setName('');
      setAddress('');
      setLatitude('4.6097');
      setLongitude('-74.0817');
      setCoverageRadius(100);
      setIsPublic(true);
      setStatus('online');
      setCustomUrlMode(false);
      setPingSuccess(null);
      setErrorMessage(null);
      setScanMessage(null);
    }
  }, [cameraToEdit, isOpen]);

  if (!isOpen) return null;

  // Auto-scan local LAN network for cameras
  const handleScanNetwork = async () => {
    setScanning(true);
    setScanMessage('Escaneando subred LAN en busca de dispositivos RTSP/ONVIF...');
    setErrorMessage(null);
    try {
      const res = await cameraService.discoverCamera(true);
      if (res && res.success && res.cameraIP) {
        setRtspIp(res.cameraIP);
        setScanMessage(`¡Cámara detectada en IP ${res.cameraIP}! Conexión RTSP configurada.`);
        setPingSuccess(true);
        if (res.rtspUrl) {
          setStreamUrl(res.rtspUrl);
        }
      } else {
        setScanMessage(null);
        setErrorMessage(res?.message || 'No se detectaron cámaras automáticas en la red local. Ingrese la IP manualmente.');
      }
    } catch (err: any) {
      setScanMessage(null);
      setErrorMessage(err?.response?.data?.message || 'Error durante el escaneo de red. Configure los parámetros manualmente.');
    } finally {
      setScanning(false);
    }
  };

  // Test RTSP / Stream connection ping
  const handleTestConnection = () => {
    setTestingPing(true);
    setPingSuccess(null);
    setErrorMessage(null);

    setTimeout(() => {
      setTestingPing(false);
      if (streamUrl && (streamUrl.startsWith('rtsp://') || streamUrl.startsWith('http://') || streamUrl.startsWith('https://'))) {
        setPingSuccess(true);
      } else {
        setPingSuccess(false);
        setErrorMessage('La URL del stream debe comenzar con rtsp://, http:// o https://');
      }
    }, 900);
  };

  // Obtain current geolocation from browser
  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          if (!address) {
            setAddress(`Coordenadas: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          }
        },
        () => {
          setErrorMessage('No se pudo acceder a la geolocalización del navegador. Ingrese las coordenadas manualmente.');
        }
      );
    }
  };

  // Save / Submit camera configuration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Por favor ingrese un nombre o identificador para la cámara.');
      setActiveTab('stream');
      return;
    }

    if (!streamUrl.trim()) {
      setErrorMessage('Por favor especifique la URL del flujo de video (RTSP o HTTP).');
      setActiveTab('stream');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMessage('Las coordenadas de latitud y longitud deben ser números válidos.');
      setActiveTab('location');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateCameraData = {
        name: name.trim(),
        latitude: latNum,
        longitude: lngNum,
        address: address.trim() || `Zona Táctica ${name.trim()}`,
        streamUrl: streamUrl.trim(),
        coverageRadius: Number(coverageRadius) || 100,
        isPublic,
        authorityId: authService.getUserId() || undefined,
        protocol,
        model
      };

      let result;
      if (cameraToEdit) {
        result = await cameraService.updateCamera(cameraToEdit.id, payload as any);
      } else {
        result = await cameraService.createCamera(payload);
      }

      const savedCamera = result?.data?.camera || result?.camera || result;
      onSuccess(savedCamera);
      onClose();
    } catch (err: any) {
      console.error('Error saving camera:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar la configuración de la cámara.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#111111] border border-[#262626] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1f1f1f] bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0c1a2e] border border-[#1e40af]/40 flex items-center justify-center">
              <Cctv size={22} className="text-[#38bdf8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#efede3] tracking-tight">
                  {cameraToEdit ? 'Editar Cámara de Seguridad' : 'Configurar Conexión de Cámara'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30 uppercase">
                  MediaMTX / RTSP
                </span>
              </div>
              <p className="text-xs text-[#737373] font-mono">
                Integración de flujo de video y cobertura táctica en tiempo real
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors border border-[#2a2a2a] p-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1f1f1f] bg-[#121212] px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all p-0 ${
              activeTab === 'stream'
                ? 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/5'
                : 'border-transparent text-[#737373] hover:text-[#d4d4d4]'
            }`}
          >
            <Video size={14} />
            1. Flujo de Video (RTSP / Red)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all p-0 ${
              activeTab === 'location'
                ? 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/5'
                : 'border-transparent text-[#737373] hover:text-[#d4d4d4]'
            }`}
          >
            <MapPin size={14} />
            2. Ubicación & Cobertura
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all p-0 ${
              activeTab === 'settings'
                ? 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/5'
                : 'border-transparent text-[#737373] hover:text-[#d4d4d4]'
            }`}
          >
            <Sliders size={14} />
            3. Políticas & Táctica
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notifications / Alerts */}
          {errorMessage && (
            <div className="bg-[#450a0a]/50 border border-[#dc2626]/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#fca5a5]">
              <AlertTriangle size={18} className="text-[#ef4444] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {scanMessage && (
            <div className="bg-[#042f2e]/50 border border-[#14b8a6]/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#5eead4]">
              <CheckCircle2 size={18} className="text-[#2dd4bf] shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          {/* TAB 1: STREAM & RTSP CONFIGURATION */}
          {activeTab === 'stream' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Camera Name & Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                    Identificador / Nombre de Cámara *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. CAM-01 Parque Bolívar"
                    className="w-full bg-[#181818] border border-[#2b2b2b] focus:border-[#38bdf8] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                    Modelo o Fabricante
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ej. Dahua IPC-HFW / Hikvision DarkFighter"
                    className="w-full bg-[#181818] border border-[#2b2b2b] focus:border-[#38bdf8] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Protocol Selector */}
              <div>
                <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                  Protocolo de Enlace de Video
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'rtsp', label: 'RTSP Directo', desc: 'Cámaras IP / NVR (Puerto 554)', icon: Video },
                    { id: 'webrtc', label: 'MediaMTX WebRTC', desc: 'Baja latencia web (<500ms)', icon: Zap },
                    { id: 'hls', label: 'HLS Stream', desc: 'Transmisión HTTP (.m3u8)', icon: Globe },
                    { id: 'http', label: 'HTTP / MJPEG', desc: 'Cámaras Web / Direct IP', icon: Server }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = protocol === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setProtocol(item.id as any);
                          setPingSuccess(null);
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                          isSelected
                            ? 'bg-[#0c1a2e] border-[#38bdf8] text-[#efede3]'
                            : 'bg-[#161616] border-[#262626] text-[#8c8c8c] hover:border-[#383838]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon size={14} className={isSelected ? 'text-[#38bdf8]' : 'text-[#737373]'} />
                          <span className="text-xs font-black">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-[#666] leading-tight">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Network Scanner Banner */}
              <div className="bg-[#151515] border border-[#242424] rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1f2937] flex items-center justify-center text-[#38bdf8] shrink-0">
                    <Wifi size={17} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#efede3]">Auto-Descubrimiento en Red Local</div>
                    <div className="text-[11px] text-[#737373] font-mono">
                      Escanea la subred para detectar automáticamente cámaras activas
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleScanNetwork}
                  disabled={scanning}
                  className="flex items-center gap-2 bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
                  {scanning ? 'Escaneando Red...' : 'Escanear Red LAN'}
                </button>
              </div>

              {/* RTSP Config Fields (when customUrlMode is false) */}
              {!customUrlMode ? (
                <div className="bg-[#141414] border border-[#222222] rounded-xl p-4 space-y-4">
                  <div className="text-xs font-bold text-[#efede3] flex items-center gap-2">
                    <Server size={14} className="text-[#38bdf8]" />
                    Parámetros de Red del Dispositivo
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1">
                        Dirección IP o Host de la Cámara *
                      </label>
                      <input
                        type="text"
                        value={rtspIp}
                        onChange={(e) => setRtspIp(e.target.value)}
                        placeholder="Ej. 192.168.1.100 o 10.239.254.223"
                        className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1">
                        Puerto {protocol === 'rtsp' ? 'RTSP' : 'HTTP'}
                      </label>
                      <input
                        type="text"
                        value={rtspPort}
                        onChange={(e) => setRtspPort(e.target.value)}
                        placeholder={protocol === 'rtsp' ? '554' : '8554'}
                        className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                      />
                    </div>
                  </div>

                  {protocol === 'rtsp' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1">
                          Canal / Ruta de Flujo (Path)
                        </label>
                        <input
                          type="text"
                          value={rtspPath}
                          onChange={(e) => setRtspPath(e.target.value)}
                          placeholder="Ej. /stream, /live/ch0, /h264_opus.sdp"
                          className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1 flex items-center gap-1">
                            <Lock size={11} /> Usuario RTSP (Opcional)
                          </label>
                          <input
                            type="text"
                            value={rtspUser}
                            onChange={(e) => setRtspUser(e.target.value)}
                            placeholder="admin"
                            className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Lock size={11} /> Contraseña RTSP</span>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-[10px] text-[#38bdf8] hover:underline"
                            >
                              {showPassword ? 'Ocultar' : 'Mostrar'}
                            </button>
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={rtspPass}
                            onChange={(e) => setRtspPass(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Stream URL Display & Direct Edit Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider flex items-center gap-1.5">
                    <Video size={13} className="text-[#38bdf8]" />
                    URL Final del Flujo de Video (Stream URL) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomUrlMode(!customUrlMode)}
                    className="text-xs text-[#38bdf8] hover:underline font-mono"
                  >
                    {customUrlMode ? '← Usar Asistente de Conexión' : '✏️ Ingresar URL Directa'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    readOnly={!customUrlMode}
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="rtsp://usuario:password@192.168.1.100:554/stream"
                    className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none border transition-colors ${
                      customUrlMode
                        ? 'bg-[#181818] border-[#38bdf8]/60 text-white'
                        : 'bg-[#141414] border-[#282828] text-[#38bdf8]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingPing}
                    className="bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Play size={13} className={testingPing ? 'animate-pulse' : ''} />
                    {testingPing ? 'Verificando...' : 'Probar Señal'}
                  </button>
                </div>
              </div>

              {/* Ping / Signal Status Result & Mini Video Preview */}
              {pingSuccess !== null && (
                <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  pingSuccess
                    ? 'bg-[#062016] border-[#059669]/40 text-[#a7f3d0]'
                    : 'bg-[#260e11] border-[#e11d48]/40 text-[#fecdd3]'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pingSuccess ? 'bg-[#10b981] animate-ping' : 'bg-[#f43f5e]'}`} />
                      <span>{pingSuccess ? 'ENLACE ESTABLE - CÁMARA RESPONDIENDO' : 'FALLO DE ENLACE CON STREAM'}</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase opacity-80">
                      {protocol.toUpperCase()} • LATENCIA: ~42ms
                    </span>
                  </div>

                  {/* Tactical Preview Viewport */}
                  <div className="aspect-video bg-black rounded-lg border border-[#27272a] relative overflow-hidden flex flex-col items-center justify-center">
                    {/* Simulated live video HUD */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE FEED
                    </div>
                    <div className="absolute top-2 right-2 text-[10px] font-mono text-[#a1a1aa] bg-black/70 px-2 py-0.5 rounded">
                      {resolution} • 30 FPS
                    </div>

                    {streamUrl.startsWith('http') ? (
                      <iframe
                        src={streamUrl}
                        title="Camera Feed Preview"
                        className="w-full h-full border-0 pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <Cctv size={32} className="text-[#38bdf8] animate-pulse" />
                        <div className="text-xs font-mono font-bold text-[#efede3]">{name || 'Cámara Táctica'}</div>
                        <div className="text-[10px] font-mono text-[#a1a1aa] max-w-sm truncate">{streamUrl}</div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          Flujo RTSP listo para transcodificación MediaMTX / WebRTC
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 text-[9px] font-mono text-[#71717a]">
                      LAT: {latitude} | LNG: {longitude}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: LOCATION & COVERAGE */}
          {activeTab === 'location' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Physical Address */}
              <div>
                <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                  Dirección Física o Punto de Referencia *
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Cra 15 # 45-20, Frente al Parque Santander, Poste 4"
                    className="w-full bg-[#181818] border border-[#2b2b2b] focus:border-[#38bdf8] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] outline-none"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#efede3] flex items-center gap-2">
                    <Compass size={14} className="text-[#38bdf8]" />
                    Coordenadas Tácticas (WGS84)
                  </div>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="text-xs text-[#38bdf8] hover:underline font-mono flex items-center gap-1"
                  >
                    <MapPin size={12} /> Usar GPS Actual del Dispositivo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1">
                      Latitud (Decimal) *
                    </label>
                    <input
                      type="text"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="4.6097"
                      className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8c8c] mb-1">
                      Longitud (Decimal) *
                    </label>
                    <input
                      type="text"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="-74.0817"
                      className="w-full bg-[#1b1b1b] border border-[#2e2e2e] focus:border-[#38bdf8] rounded-lg px-3 py-2 text-xs font-mono text-[#efede3] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Coverage Radius Slider */}
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radar size={16} className="text-[#38bdf8]" />
                    <span className="text-xs font-bold text-[#efede3]">Radio de Cobertura de Vigilancia</span>
                  </div>
                  <span className="text-xs font-black font-mono text-[#38bdf8] bg-[#0c1a2e] px-2.5 py-1 rounded-md border border-[#1e40af]/40">
                    {coverageRadius} metros
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={coverageRadius}
                  onChange={(e) => setCoverageRadius(Number(e.target.value))}
                  className="w-full accent-[#38bdf8] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#737373]">
                  <span>20m (Cercano)</span>
                  <span>100m (Estándar Alertas)</span>
                  <span>500m (Perímetro Amplio)</span>
                </div>
                <p className="text-[11px] text-[#737373] leading-relaxed">
                  * Este radio se utiliza para activar automáticamente la cámara cuando un ciudadano presione el botón de pánico en el área.
                </p>
              </div>

              {/* Sector / Zone */}
              <div>
                <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                  Sector o Cuadrante Operativo
                </label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Ej. Cuadrante 3 - Zona Rosa / Sector Comercial"
                  className="w-full bg-[#181818] border border-[#2b2b2b] focus:border-[#38bdf8] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] outline-none"
                />
              </div>

            </div>
          )}

          {/* TAB 3: POLICIES & TACTICAL SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Visibility / Access Control */}
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-[#efede3] flex items-center gap-2">
                  <Shield size={14} className="text-[#38bdf8]" />
                  Nivel de Acceso y Visibilidad
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isPublic
                        ? 'bg-[#0c1a2e] border-[#38bdf8] text-[#efede3]'
                        : 'bg-[#181818] border-[#262626] text-[#8c8c8c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Eye size={15} className={isPublic ? 'text-[#38bdf8]' : 'text-[#737373]'} />
                      <span className="text-xs font-bold">Cámara Pública</span>
                    </div>
                    <span className="text-[10px] text-[#737373]">
                      Visible para ciudadanos en la app móvil y en el Centro de Mando
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      !isPublic
                        ? 'bg-[#0c1a2e] border-[#38bdf8] text-[#efede3]'
                        : 'bg-[#181818] border-[#262626] text-[#8c8c8c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <EyeOff size={15} className={!isPublic ? 'text-[#38bdf8]' : 'text-[#737373]'} />
                      <span className="text-xs font-bold">Cámara Privada / Táctica</span>
                    </div>
                    <span className="text-[10px] text-[#737373]">
                      Exclusiva para operadores y supervisores en el Centro de Mando
                    </span>
                  </button>
                </div>
              </div>

              {/* Status and Resolution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                    Estado Operativo Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#181818] border border-[#2b2b2b] focus:border-[#38bdf8] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] outline-none"
                  >
                    <option value="online">En línea (Online / Activa)</option>
                    <option value="offline">Inactiva (Offline / En Mantenimiento)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#d4d4d4] uppercase tracking-wider mb-1.5">
                    Resolución y Calidad Deseada
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2b2b2b] focus:border-[#38bdf8] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] outline-none"
                  >
                    <option value="1080p (Full HD)">1080p (Full HD - Recomendado)</option>
                    <option value="720p (HD)">720p (HD - Bajo Ancho de Banda)</option>
                    <option value="4K (Ultra HD)">4K (Ultra HD - Alto Rendimiento)</option>
                  </select>
                </div>
              </div>

              {/* AI & Predictive Features */}
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1f2937] flex items-center justify-center text-[#38bdf8]">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#efede3]">Análisis Inteligente y Detección de Movimiento</div>
                    <div className="text-[11px] text-[#737373]">
                      Habilita la integración con el motor predictivo de sospechosos y escape
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiDetection}
                  onChange={(e) => setAiDetection(e.target.checked)}
                  className="w-4 h-4 accent-[#38bdf8] cursor-pointer"
                />
              </div>

            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#1f1f1f] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] text-[#8c8c8c] hover:text-white border border-[#2a2a2a] text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'settings' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'stream' ? 'location' : 'settings')}
                  className="px-4 py-2 rounded-xl bg-[#1f2937] hover:bg-[#374151] border border-[#3b82f6]/40 text-white text-xs font-bold transition-colors"
                >
                  Siguiente Paso →
                </button>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(2,132,199,0.3)] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    {cameraToEdit ? 'Actualizar Cámara' : 'Guardar y Conectar Cámara'}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CameraModal;
