import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cctv, 
  Plus, 
  Search, 
  Wifi, 
  WifiOff, 
  ArrowLeft, 
  Video, 
  MapPin, 
  Radar, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit3, 
  Play, 
  X, 
  RefreshCw,
  Compass,
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers
} from 'lucide-react';
import type { Camera } from '../../services/cameras';
import { cameraService } from '../../services/cameras';
import { CameraModal } from '../../components/CommandCenter/CameraModal';
import { useCommandStore } from '../../stores/useCommandStore';

const AdminCameras: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedCamera } = useCommandStore();

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraToEdit, setCameraToEdit] = useState<Camera | null>(null);

  // Live video feed viewer modal
  const [viewingCamera, setViewingCamera] = useState<Camera | null>(null);

  // Load cameras from API
  const fetchCameras = async () => {
    setLoading(true);
    try {
      const data = await cameraService.getCameras();
      setCameras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  // Filtered cameras
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch = 
      cam.name?.toLowerCase().includes(search.toLowerCase()) ||
      cam.location?.address?.toLowerCase().includes(search.toLowerCase()) ||
      cam.streamUrl?.toLowerCase().includes(search.toLowerCase()) ||
      cam.id?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'online') return cam.status === 'online';
    if (filterStatus === 'offline') return cam.status !== 'online';
    return true;
  });

  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const offlineCount = cameras.filter(c => c.status !== 'online').length;

  // Handle open add modal
  const handleOpenAddModal = () => {
    setCameraToEdit(null);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleEditCamera = (cam: Camera) => {
    setCameraToEdit(cam);
    setIsModalOpen(true);
  };

  // Handle delete camera
  const handleDeleteCamera = async (cam: Camera) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar la cámara "${cam.name}"?`);
    if (!confirmed) return;

    try {
      await cameraService.deleteCamera(cam.id);
      setCameras(prev => prev.filter(c => c.id !== cam.id));
    } catch (err) {
      console.error('Error deleting camera:', err);
      alert('No se pudo eliminar la cámara. Intente nuevamente.');
    }
  };

  // Handle successful save from modal
  const handleSaveSuccess = (_savedCam: Camera) => {
    fetchCameras();
  };

  // Inspect on tactical map
  const handleInspectOnMap = (cam: Camera) => {
    setSelectedCamera({
      id: cam.id,
      name: cam.name,
      lat: cam.location?.latitude || 0,
      lng: cam.location?.longitude || 0,
      rtspUrl: cam.streamUrl
    });
    navigate('/command-center');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-y-auto custom-scrollbar theme-transition">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all mr-1 p-0 shrink-0 shadow-xs cursor-pointer"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)]/40 flex items-center justify-center shrink-0 text-[var(--brand)] shadow-xs">
            <Cctv size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Cámaras de Seguridad</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--brand)] dark:text-sky-400 border border-[var(--accent-border)]/40 uppercase font-bold">
                MediaMTX RTSP / WebRTC
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Monitoreo perimetral, analítica de cobertura y gestión de cuadrantes de vigilancia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón rápido para ir al Mosaico 4x4 */}
          <button
            onClick={() => navigate('/command-center/camera-grid')}
            title="Abrir Mosaico 4x4 en Pantalla Completa"
            className="flex items-center gap-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 text-[var(--text-primary)] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Layers size={14} className="text-[var(--brand)]" />
            <span className="hidden md:inline">Mosaico 4x4</span>
          </button>

          <button 
            onClick={fetchCameras}
            disabled={loading}
            title="Refrescar lista"
            className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all p-0 shadow-xs cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--brand)]' : ''} />
          </button>
          
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} /> 
            <span>Agregar Cámara</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards (KPI) con Soporte Completo para Tema Claro y Oscuro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* KPI 1: Total Registradas */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-[var(--bg-surface)] border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs theme-transition ${
            filterStatus === 'all' 
              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10 dark:bg-sky-950/30' 
              : 'border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Cctv size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{cameras.length}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono font-bold">Total Registradas</div>
            </div>
          </div>
        </div>

        {/* KPI 2: En Línea (Streaming) */}
        <div 
          onClick={() => setFilterStatus('online')}
          className={`bg-[var(--bg-surface)] border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs theme-transition ${
            filterStatus === 'online' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/30' 
              : 'border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wifi size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{onlineCount}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono font-bold">En Línea (Streaming)</div>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* KPI 3: Offline / Inactivas */}
        <div 
          onClick={() => setFilterStatus('offline')}
          className={`bg-[var(--bg-surface)] border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs theme-transition ${
            filterStatus === 'offline' 
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/10 dark:bg-rose-950/30' 
              : 'border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <WifiOff size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{offlineCount}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono font-bold">Offline / Inactivas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cámara por nombre, dirección física, GPS o URL de stream..." 
          className="w-full bg-[var(--bg-input)] border border-neutral-300 dark:border-zinc-800 focus:border-[var(--brand)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors font-mono shadow-xs" 
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── CUADRÍCULA DE 4 COLUMNAS DE CÁMARAS ────────────────── */}
      {loading ? (
        <div className="flex-1 bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 min-h-[300px] theme-transition">
          <RefreshCw size={26} className="text-[var(--brand)] animate-spin" />
          <span className="text-xs font-mono text-[var(--text-muted)]">Consultando cámaras registradas en la Base de Datos...</span>
        </div>
      ) : filteredCameras.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
          {filteredCameras.map((cam) => {
            const isOnline = cam.status === 'online';
            const lat = cam.location?.latitude;
            const lng = cam.location?.longitude;

            return (
              <div 
                key={cam.id}
                className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800/80 hover:border-[var(--brand)] dark:hover:border-sky-500/60 rounded-2xl overflow-hidden flex flex-col transition-all group shadow-sm hover:shadow-md theme-transition"
              >
                {/* Simulated / Live Video Header Viewport */}
                <div 
                  onClick={() => setViewingCamera(cam)}
                  className="aspect-video bg-neutral-950 relative flex items-center justify-center cursor-pointer group-hover:opacity-95 overflow-hidden select-none"
                >
                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-mono font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                      {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Coverage Radius Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-mono text-sky-400">
                    <Radar size={11} />
                    <span>{cam.coverageRadius || 100}m</span>
                  </div>

                  {/* Tactical CCTV Visual Canvas Feed */}
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 relative bg-radial from-neutral-800 to-black select-none">
                    {/* Scanlines CRT overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

                    <div className="w-10 h-10 border border-sky-400/30 rounded-full flex items-center justify-center relative mb-1">
                      <Cctv size={18} className="text-sky-400 animate-pulse" />
                      <div className="absolute w-2 h-0.5 bg-sky-400/50 top-1/2 -left-1" />
                      <div className="absolute w-2 h-0.5 bg-sky-400/50 top-1/2 -right-1" />
                    </div>

                    <div className="text-[10px] font-mono font-bold text-white tracking-wider">
                      {isOnline ? 'SEÑAL EN VIVO' : 'SIN CONEXIÓN'}
                    </div>
                    <div className="text-[8px] font-mono text-zinc-400 truncate max-w-[160px] bg-black/40 px-1 rounded mt-0.5">
                      {cam.streamUrl}
                    </div>
                  </div>

                  {/* Play Overlay On Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                    <div className="px-3 py-1.5 rounded-full bg-[var(--brand)] text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg">
                      <Play size={13} className="translate-x-0.5 fill-current" />
                      <span>MONITOREAR</span>
                    </div>
                  </div>
                </div>

                {/* Card Info Content (Enriched with More Telemetry) */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                  <div className="flex flex-col gap-1.5">
                    {/* Title + Visibility Badge */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] truncate" title={cam.name}>
                        {cam.name}
                      </h3>
                      {cam.isPublic ? (
                        <span className="shrink-0 flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
                          <Eye size={9} /> Pública
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-zinc-800 text-[var(--text-muted)] border border-neutral-300 dark:border-zinc-700">
                          <EyeOff size={9} /> Privada
                        </span>
                      )}
                    </div>

                    {/* Address with MapPin */}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <MapPin size={12} className="shrink-0 text-[var(--brand)]" />
                      <span className="truncate" title={cam.location?.address}>
                        {cam.location?.address || 'Sin dirección física especificada'}
                      </span>
                    </div>

                    {/* Technical Telemetry Grid (GPS Coords + Stream Protocol) */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                      {/* GPS Badge */}
                      <div className="bg-[var(--bg-elevated)] px-2 py-1 rounded border border-neutral-200 dark:border-zinc-800 flex items-center gap-1 text-[var(--text-muted)] truncate">
                        <Compass size={10} className="shrink-0 text-sky-500" />
                        <span className="truncate">
                          {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Sin GPS'}
                        </span>
                      </div>

                      {/* Stream Protocol */}
                      <div className="bg-[var(--bg-elevated)] px-2 py-1 rounded border border-neutral-200 dark:border-zinc-800 flex items-center gap-1 text-[var(--text-muted)] truncate">
                        <Radio size={10} className="shrink-0 text-emerald-500" />
                        <span className="truncate">
                          {cam.streamUrl.includes('rtsp') ? 'RTSP TCP' : cam.streamUrl.includes('webrtc') ? 'WebRTC' : 'HLS/HTTP'}
                        </span>
                      </div>
                    </div>

                    {/* Short Camera ID */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] pt-0.5">
                      <span>ID: {cam.id.slice(0, 8)}...</span>
                      <span className="text-[var(--text-muted)]">Radio: {cam.coverageRadius || 100}m</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-zinc-800/80 flex items-center justify-between gap-1.5">
                    {/* Ver en Mapa */}
                    <button
                      onClick={() => handleInspectOnMap(cam)}
                      title="Ubicar en Mapa Táctico"
                      className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] border border-neutral-200 dark:border-zinc-800 text-[var(--text-primary)] text-xs font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      <MapPin size={11} className="text-[var(--brand)]" />
                      <span>Mapa</span>
                    </button>

                    {/* Monitorear en modal */}
                    <button
                      onClick={() => setViewingCamera(cam)}
                      title="Abrir visor en vivo"
                      className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      <Video size={11} />
                      <span>Ver Feed</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditCamera(cam)}
                        title="Editar configuración"
                        className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] border border-neutral-200 dark:border-zinc-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer p-0"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteCamera(cam)}
                        title="Eliminar cámara"
                        className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] hover:bg-rose-500/10 border border-neutral-200 dark:border-zinc-800 hover:border-rose-500/40 text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer p-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-center p-8 min-h-[360px] theme-transition">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-muted)]">
            <Cctv size={36} strokeWidth={1.5} />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-[var(--text-primary)]">No hay cámaras configuradas</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Integra tus cámaras de seguridad mediante RTSP, WebRTC MediaMTX o detección automática en la red local para monitorear el territorio en tiempo real.
            </p>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} /> Configurar Primera Cámara
          </button>
        </div>
      )}

      {/* CAMERA CONFIGURATION MODAL */}
      <CameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveSuccess}
        cameraToEdit={cameraToEdit}
      />

      {/* LIVE VIDEO FEED FULL VIEWER MODAL (Con soporte de Tema) */}
      {viewingCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col theme-transition">
            
            {/* Header */}
            <div className="p-4 bg-[var(--bg-elevated)] border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <div>
                  <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 font-mono">
                    <span>🔴 EN VIVO • {viewingCamera.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--brand)] dark:text-sky-400 border border-[var(--accent-border)]/40 font-bold">
                      RADIO {viewingCamera.coverageRadius || 100}M
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[var(--text-muted)]">
                    {viewingCamera.location?.address || 'Ubicación sin referencia'} • GPS: {viewingCamera.location?.latitude?.toFixed(4)}, {viewingCamera.location?.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleInspectOnMap(viewingCamera);
                    setViewingCamera(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-neutral-200 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <MapPin size={13} className="text-[var(--brand)]" />
                  <span>Ver en Mapa</span>
                </button>

                <button
                  onClick={() => setViewingCamera(null)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors border border-neutral-200 dark:border-zinc-700 p-0 cursor-pointer shadow-xs"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center gap-3 text-center p-6 select-none">
                <Cctv size={48} className="text-sky-400 animate-pulse" />
                <div className="text-sm font-mono font-bold text-white tracking-wider">
                  STREAM CCTV EN TIEMPO REAL
                </div>
                <div className="text-xs font-mono text-sky-300 bg-sky-950/60 px-3 py-1 rounded-lg border border-sky-800/40 max-w-md truncate">
                  {viewingCamera.streamUrl}
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800">
                  Transmisión activa con MediaMTX / WHEP WebRTC • Latencia &lt; 250ms
                </span>
              </div>

              {/* Tactical HUD Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 px-2.5 py-1 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REC • 1080p • 30 FPS
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-400 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                ID: {viewingCamera.id.substring(0, 14)}...
              </div>
            </div>

            {/* Viewer Footer */}
            <div className="p-3 bg-[var(--bg-elevated)] border-t border-neutral-200 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>Protocolo: MediaMTX RTSP / WebRTC Bridge</span>
              <button
                onClick={() => setViewingCamera(null)}
                className="px-4 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-bold transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminCameras;
