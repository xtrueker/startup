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
  Layers
} from 'lucide-react';
import type { Camera } from '../../services/cameras';
import { cameraService } from '../../services/cameras';
import { CameraModal } from '../../components/CommandCenter/CameraModal';
import { useCommandStore } from '../../stores/useCommandStore';
import {
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

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

  const handleOpenAddModal = () => {
    setCameraToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditCamera = (cam: Camera) => {
    setCameraToEdit(cam);
    setIsModalOpen(true);
  };

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

  const handleSaveSuccess = (_savedCam: Camera) => {
    fetchCameras();
  };

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
    <div className="flex flex-col h-full bg-transparent text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-y-auto custom-scrollbar theme-transition">
      
      {/* Top Floating Header */}
      <LiquidGlassCard strong className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center shrink-0 p-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 text-[#0EA5E9]">
            <Cctv size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Cámaras de seguridad
              </h1>
              <StatusPill label="MediaMTX RTSP / WebRTC" tone="aqua" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Monitoreo perimetral, cobertura de alerta y cuadrantes de vigilancia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <LiquidPillButton
            variant="glass"
            size="sm"
            onClick={() => navigate('/command-center/camera-grid')}
            title="Abrir Mosaico 4x4"
          >
            <Layers size={14} className="text-[#0EA5E9]" />
            <span className="hidden md:inline">Mosaico 4x4</span>
          </LiquidPillButton>

          <button 
            onClick={fetchCameras}
            disabled={loading}
            title="Refrescar lista"
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#0EA5E9]' : ''} />
          </button>
          
          <LiquidPillButton 
            variant="obsidian"
            size="sm"
            onClick={handleOpenAddModal}
          >
            <Plus size={15} /> 
            <span>Agregar cámara</span>
          </LiquidPillButton>
        </div>
      </LiquidGlassCard>

      {/* Metrics Cards (KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <LiquidGlassCard
          strong={filterStatus === 'all'}
          onClick={() => setFilterStatus('all')}
          className={`p-5 flex items-center justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${
            filterStatus === 'all' ? 'ring-2 ring-[#0EA5E9]/50' : ''
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center text-[#0EA5E9]">
              <Cctv size={21} />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{cameras.length}</div>
              <div className="text-xs text-[var(--text-secondary)] font-medium">Total registradas</div>
            </div>
          </div>
          <StatusPill label="Todas" tone="aqua" />
        </LiquidGlassCard>

        <LiquidGlassCard
          strong={filterStatus === 'online'}
          onClick={() => setFilterStatus('online')}
          className={`p-5 flex items-center justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${
            filterStatus === 'online' ? 'ring-2 ring-[#10B981]/50' : ''
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
              <Wifi size={21} />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{onlineCount}</div>
              <div className="text-xs text-[var(--text-secondary)] font-medium">En línea (Streaming)</div>
            </div>
          </div>
          <StatusPill label="Activas" tone="emerald" pulsing />
        </LiquidGlassCard>

        <LiquidGlassCard
          strong={filterStatus === 'offline'}
          onClick={() => setFilterStatus('offline')}
          className={`p-5 flex items-center justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${
            filterStatus === 'offline' ? 'ring-2 ring-[#E11D48]/50' : ''
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/12 border border-rose-500/25 flex items-center justify-center text-[#E11D48]">
              <WifiOff size={21} />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{offlineCount}</div>
              <div className="text-xs text-[var(--text-secondary)] font-medium">Offline / Inactivas</div>
            </div>
          </div>
          <StatusPill label="Sin señal" tone="crimson" />
        </LiquidGlassCard>
      </div>

      {/* Liquid Pill Search Bar */}
      <LiquidInput
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar cámara por nombre, dirección física, GPS o URL de stream..."
        leftIcon={<Search size={16} />}
        rightElement={
          search ? (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Limpiar
            </button>
          ) : undefined
        }
      />

      {/* ── CUADRÍCULA DE 4 COLUMNAS DE CÁMARAS ────────────────── */}
      {loading ? (
        <LiquidGlassCard className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]">
          <RefreshCw size={28} className="text-[#0EA5E9] animate-spin" />
          <span className="text-xs font-mono text-[var(--text-muted)]">Consultando cámaras registradas...</span>
        </LiquidGlassCard>
      ) : filteredCameras.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 pb-6">
          {filteredCameras.map((cam) => {
            const isOnline = cam.status === 'online';
            const lat = cam.location?.latitude;
            const lng = cam.location?.longitude;

            return (
              <LiquidGlassCard 
                key={cam.id}
                strong
                className="flex flex-col transition-all group hover:-translate-y-1"
              >
                {/* Video Header Viewport */}
                <div 
                  onClick={() => setViewingCamera(cam)}
                  className="aspect-video bg-neutral-950 relative flex items-center justify-center cursor-pointer overflow-hidden select-none rounded-t-[26px]"
                >
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-[9.5px] font-mono font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                      {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-[9.5px] font-mono text-sky-400">
                    <Radar size={11} />
                    <span>{cam.coverageRadius || 100} m</span>
                  </div>

                  <div className="w-full h-full flex flex-col items-center justify-center p-3 relative bg-radial from-neutral-800 to-black">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

                    <div className="w-10 h-10 border border-sky-400/35 rounded-full flex items-center justify-center relative mb-1.5">
                      <Cctv size={18} className="text-sky-400 animate-pulse" />
                    </div>

                    <div className="text-[10px] font-mono font-bold text-white tracking-wider">
                      {isOnline ? 'SEÑAL EN VIVO' : 'SIN CONEXIÓN'}
                    </div>
                    <div className="text-[8.5px] font-mono text-zinc-400 truncate max-w-[170px] bg-black/45 px-2 py-0.5 rounded-full mt-1">
                      {cam.streamUrl}
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                    <div className="px-4 py-1.5 rounded-full bg-white text-[#0C0F14] font-semibold text-xs flex items-center gap-1.5 shadow-lg">
                      <Play size={12} className="fill-current" />
                      <span>Monitorear</span>
                    </div>
                  </div>
                </div>

                {/* Card Info Content */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-[13.5px] font-bold text-[var(--text-primary)] truncate tracking-tight" title={cam.name}>
                        {cam.name}
                      </h3>
                      {cam.isPublic ? (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/25 font-semibold">
                          <Eye size={9} /> Pública
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-strong)] font-medium">
                          <EyeOff size={9} /> Privada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <MapPin size={12} className="shrink-0 text-[#0EA5E9]" />
                      <span className="truncate" title={cam.location?.address}>
                        {cam.location?.address || 'Sin dirección física especificada'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px] font-mono">
                      <div className="bg-[var(--bg-input)] px-2.5 py-1.5 rounded-full border border-[var(--border-strong)] flex items-center gap-1 text-[var(--text-secondary)] truncate">
                        <Compass size={10} className="shrink-0 text-[#0EA5E9]" />
                        <span className="truncate">
                          {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Sin GPS'}
                        </span>
                      </div>

                      <div className="bg-[var(--bg-input)] px-2.5 py-1.5 rounded-full border border-[var(--border-strong)] flex items-center gap-1 text-[var(--text-secondary)] truncate">
                        <Radio size={10} className="shrink-0 text-[#10B981]" />
                        <span className="truncate">
                          {cam.streamUrl.includes('rtsp') ? 'RTSP TCP' : cam.streamUrl.includes('webrtc') ? 'WebRTC' : 'HLS/HTTP'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] px-1">
                      <span>ID: {cam.id.slice(0, 8)}</span>
                      <span>Radio: {cam.coverageRadius || 100} m</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleInspectOnMap(cam)}
                      title="Ubicar en Mapa Táctico"
                      className="flex-1 glass-button text-xs font-semibold py-1.5 px-2.5 rounded-full flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MapPin size={11} className="text-[#0EA5E9]" />
                      <span>Mapa</span>
                    </button>

                    <button
                      onClick={() => setViewingCamera(cam)}
                      title="Abrir visor en vivo"
                      className="flex-1 liquid-pill-obsidian text-xs font-semibold py-1.5 px-2.5 rounded-full flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Video size={11} />
                      <span>Ver feed</span>
                    </button>

                    <button
                      onClick={() => handleEditCamera(cam)}
                      title="Editar configuración"
                      className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0 shrink-0"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCamera(cam)}
                      title="Eliminar cámara"
                      className="w-8 h-8 rounded-full bg-rose-500/12 hover:bg-[#E11D48] text-[#E11D48] hover:text-white border border-rose-500/30 flex items-center justify-center transition-colors p-0 shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </LiquidGlassCard>
            );
          })}
        </div>
      ) : (
        <LiquidGlassCard className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8 min-h-[360px]">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9]">
            <Cctv size={32} strokeWidth={1.6} />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-[var(--text-primary)]">No hay cámaras configuradas</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Integra tus cámaras de seguridad mediante RTSP o WebRTC MediaMTX para monitorear el territorio en tiempo real.
            </p>
          </div>
          <LiquidPillButton variant="obsidian" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Configurar primera cámara</span>
          </LiquidPillButton>
        </LiquidGlassCard>
      )}

      {/* CAMERA CONFIGURATION MODAL */}
      <CameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveSuccess}
        cameraToEdit={cameraToEdit}
      />

      {/* LIVE VIDEO FEED FULL VIEWER MODAL */}
      {viewingCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 dark:bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <LiquidGlassCard strong className="w-full max-w-4xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse" />
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>En vivo • {viewingCamera.name}</span>
                    <StatusPill label={`Radio ${viewingCamera.coverageRadius || 100} m`} tone="aqua" />
                  </div>
                  <div className="text-xs font-mono text-[var(--text-muted)]">
                    {viewingCamera.location?.address || 'Ubicación sin referencia'} • GPS: {viewingCamera.location?.latitude?.toFixed(4)}, {viewingCamera.location?.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <LiquidPillButton
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    handleInspectOnMap(viewingCamera);
                    setViewingCamera(null);
                  }}
                >
                  <MapPin size={13} className="text-[#0EA5E9]" />
                  <span>Ver en mapa</span>
                </LiquidPillButton>

                <button
                  onClick={() => setViewingCamera(null)}
                  className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center gap-3 text-center p-6 select-none">
                <Cctv size={48} className="text-sky-400 animate-pulse" />
                <div className="text-sm font-mono font-bold text-white tracking-wider">
                  STREAM CCTV EN TIEMPO REAL
                </div>
                <div className="text-xs font-mono text-sky-300 bg-sky-950/60 px-3.5 py-1 rounded-full border border-sky-800/40 max-w-md truncate">
                  {viewingCamera.streamUrl}
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                  Transmisión activa con MediaMTX / WHEP WebRTC
                </span>
              </div>

              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REC • 1080p • 30 FPS
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-400 bg-black/75 px-2.5 py-0.5 rounded-full">
                ID: {viewingCamera.id.substring(0, 14)}...
              </div>
            </div>

            <div className="p-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>Protocolo: MediaMTX RTSP / WebRTC Bridge</span>
              <LiquidPillButton variant="obsidian" size="sm" onClick={() => setViewingCamera(null)}>
                Cerrar visor
              </LiquidPillButton>
            </div>
          </LiquidGlassCard>
        </div>
      )}

    </div>
  );
};

export default AdminCameras;
