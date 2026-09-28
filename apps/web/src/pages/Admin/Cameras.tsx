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
  RefreshCw
} from 'lucide-react';
import type { Camera } from '../../services/cameras';
import { cameraService } from '../../services/cameras';
import { CameraModal } from '../../components/CommandCenter/CameraModal';

const AdminCameras: React.FC = () => {
  const navigate = useNavigate();

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
      cam.streamUrl?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'online') return cam.status === 'online';
    if (filterStatus === 'offline') return cam.status !== 'online';
    return true;
  });

  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const offlineCount = cameras.filter(c => c.status !== 'online').length;

  // Handle open modal for new camera
  const handleOpenAddModal = () => {
    setCameraToEdit(null);
    setIsModalOpen(true);
  };

  // Handle edit camera
  const handleEditCamera = (cam: Camera) => {
    setCameraToEdit(cam);
    setIsModalOpen(true);
  };

  // Handle delete camera
  const handleDeleteCamera = async (cam: Camera) => {
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar la cámara "${cam.name}"?`);
    if (!confirmDelete) return;

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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-[#f5f5f5] p-6 lg:p-8 gap-6 overflow-y-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0 shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#0c1a2e]/80 border border-[#1e40af]/40 flex items-center justify-center shrink-0">
            <Cctv size={20} className="text-[#38bdf8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#efede3] tracking-tight">Cámaras de Seguridad</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30 uppercase">
                MediaMTX RTSP / WebRTC
              </span>
            </div>
            <p className="text-xs text-[#737373] font-mono">
              Monitoreo en vivo, control perimetral y cobertura de alerta ciudadana
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchCameras}
            disabled={loading}
            title="Refrescar lista"
            className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all p-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_14px_rgba(2,132,199,0.3)] active:scale-[0.98]"
          >
            <Plus size={16} /> 
            <span>Agregar Cámara</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-[#111111] border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
            filterStatus === 'all' ? 'border-[#38bdf8]/60 bg-[#161a22]' : 'border-[#1e1e1e] hover:border-[#2e2e2e]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0c1a2e] flex items-center justify-center text-[#38bdf8]">
              <Cctv size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-[#efede3]">{cameras.length}</div>
              <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono">Total Registradas</div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('online')}
          className={`bg-[#111111] border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
            filterStatus === 'online' ? 'border-[#10b981]/60 bg-[#0e1c15]' : 'border-[#1e1e1e] hover:border-[#2e2e2e]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#062016] flex items-center justify-center text-[#34d399]">
              <Wifi size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-[#efede3]">{onlineCount}</div>
              <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono">En Línea (Streaming)</div>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
        </div>

        <div 
          onClick={() => setFilterStatus('offline')}
          className={`bg-[#111111] border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all ${
            filterStatus === 'offline' ? 'border-[#f43f5e]/60 bg-[#241115]' : 'border-[#1e1e1e] hover:border-[#2e2e2e]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2b1114] flex items-center justify-center text-[#fb7185]">
              <WifiOff size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-[#efede3]">{offlineCount}</div>
              <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono">Offline / Inactivas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#525252]" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, dirección, IP o URL de stream..." 
          className="w-full bg-[#121212] border border-[#262626] focus:border-[#38bdf8]/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#d4d4d4] placeholder-[#525252] outline-none transition-colors font-mono" 
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Camera Grid or Empty State */}
      {loading ? (
        <div className="flex-1 bg-[#111111] border border-[#1e1e1e] rounded-2xl flex flex-col items-center justify-center gap-3 min-h-[300px]">
          <RefreshCw size={26} className="text-[#38bdf8] animate-spin" />
          <span className="text-xs font-mono text-[#737373]">Consultando cámaras registradas...</span>
        </div>
      ) : filteredCameras.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCameras.map((cam) => {
            const isOnline = cam.status === 'online';
            return (
              <div 
                key={cam.id}
                className="bg-[#121212] border border-[#202020] hover:border-[#383838] rounded-2xl overflow-hidden flex flex-col transition-all group shadow-lg"
              >
                {/* Simulated / Live Video Header Viewport */}
                <div 
                  onClick={() => setViewingCamera(cam)}
                  className="aspect-video bg-black relative flex items-center justify-center cursor-pointer group-hover:opacity-95 overflow-hidden"
                >
                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-mono font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                      {isOnline ? 'EN LÍNEA' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Coverage Radius Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-mono text-[#38bdf8]">
                    <Radar size={11} />
                    <span>{cam.coverageRadius || 100}m</span>
                  </div>

                  {/* Video Viewport or Stream Signal */}
                  {cam.streamUrl && cam.streamUrl.startsWith('http') ? (
                    <iframe
                      src={cam.streamUrl}
                      title={cam.name}
                      className="w-full h-full border-0 pointer-events-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center p-4">
                      <Cctv size={30} className="text-[#38bdf8]/60 group-hover:text-[#38bdf8] transition-colors" />
                      <span className="text-[10px] font-mono text-[#888] group-hover:text-[#ccc]">
                        {cam.streamUrl ? 'Click para Abrir Feed de Video' : 'Sin URL configurada'}
                      </span>
                    </div>
                  )}

                  {/* Play Overlay On Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-[#0284c7]/90 text-white flex items-center justify-center shadow-lg">
                      <Play size={18} className="translate-x-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Info Content */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#efede3] truncate">{cam.name}</h3>
                      {cam.isPublic ? (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/20">
                          <Eye size={10} /> Pública
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#888] border border-[#333]">
                          <EyeOff size={10} /> Privada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#737373] mt-1.5">
                      <MapPin size={12} className="shrink-0 text-[#a3a3a3]" />
                      <span className="truncate">{cam.location?.address || 'Sin dirección física especificada'}</span>
                    </div>

                    <div className="text-[10px] font-mono text-[#525252] truncate mt-1">
                      {cam.streamUrl || 'rtsp://...'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-[#1d1d1d] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingCamera(cam)}
                      className="flex-1 bg-[#181818] hover:bg-[#222222] border border-[#292929] hover:border-[#38bdf8]/50 text-[#efede3] hover:text-[#38bdf8] text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all p-0"
                    >
                      <Video size={13} />
                      <span>Monitorear</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditCamera(cam)}
                        title="Editar configuración"
                        className="w-8 h-8 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#292929] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors p-0"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCamera(cam)}
                        title="Eliminar cámara"
                        className="w-8 h-8 rounded-lg bg-[#181818] hover:bg-[#2e1316] border border-[#292929] hover:border-[#e11d48]/40 text-[#a3a3a3] hover:text-[#fb7185] flex items-center justify-center transition-colors p-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 bg-[#111111] border border-[#1e1e1e] rounded-2xl flex flex-col items-center justify-center gap-4 text-center p-8 min-h-[360px]">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#525252]">
            <Cctv size={36} strokeWidth={1.5} />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-[#efede3]">No hay cámaras configuradas</h3>
            <p className="text-xs text-[#737373] mt-1 leading-relaxed">
              Integra tus cámaras de seguridad mediante RTSP, WebRTC MediaMTX o detección automática en la red local para monitorear el territorio en tiempo real.
            </p>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_4px_14px_rgba(2,132,199,0.3)]"
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

      {/* LIVE VIDEO FEED FULL VIEWER MODAL */}
      {viewingCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-[#2b2b2b] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-[#141414] border-b border-[#222222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <div>
                  <div className="text-sm font-black text-[#efede3] uppercase tracking-wider flex items-center gap-2">
                    <span>🔴 EN VIVO • {viewingCamera.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30">
                      RADIO {viewingCamera.coverageRadius || 100}M
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#737373]">
                    {viewingCamera.location?.address || 'Ubicación sin referencia'} • GPS: {viewingCamera.location?.latitude?.toFixed(4)}, {viewingCamera.location?.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingCamera(null)}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors border border-[#2a2a2a] p-0"
              >
                <X size={17} />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              {viewingCamera.streamUrl && viewingCamera.streamUrl.startsWith('http') ? (
                <iframe
                  src={viewingCamera.streamUrl}
                  title={viewingCamera.name}
                  className="w-full h-full border-0 pointer-events-none"
                  allowFullScreen
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <Cctv size={48} className="text-[#38bdf8] animate-pulse" />
                  <div className="text-sm font-mono font-bold text-[#efede3]">
                    STREAM RTSP ENTRANTE
                  </div>
                  <div className="text-xs font-mono text-[#38bdf8] bg-[#0c1a2e] px-3 py-1 rounded-lg border border-[#1e40af]/40 max-w-md truncate">
                    {viewingCamera.streamUrl}
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800">
                    Transmisión activa con MediaMTX / WHEP WebRTC
                  </span>
                </div>
              )}

              {/* Tactical HUD Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 px-2.5 py-1 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REC • 1080p • 30 FPS
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-[#8c8c8c] bg-black/70 px-2 py-0.5 rounded">
                ID: {viewingCamera.id.substring(0, 14)}...
              </div>
            </div>

            {/* Viewer Footer */}
            <div className="p-3 bg-[#141414] border-t border-[#222222] flex items-center justify-between text-xs text-[#737373]">
              <span className="font-mono">Protocolo: MediaMTX RTSP / WebRTC Bridge</span>
              <button
                onClick={() => setViewingCamera(null)}
                className="px-4 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-white font-bold transition-colors"
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
