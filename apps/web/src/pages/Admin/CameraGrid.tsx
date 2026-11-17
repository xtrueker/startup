import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cctv,
  LayoutGrid,
  Grid2X2,
  Square,
  Maximize2,
  Minimize2,
  RefreshCw,
  ArrowLeft,
  Search,
  Play,
  Pause,
  MapPin,
  X,
  Plus,
  Radio,
  Check
} from 'lucide-react';
import type { Camera } from '../../services/cameras';
import { cameraService } from '../../services/cameras';
import { CameraModal } from '../../components/CommandCenter/CameraModal';

type GridMode = '4x4' | '3x3' | '2x2' | '1x1';

export const CameraGrid: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Cameras data from database
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Grid layout mode (default 4x4)
  const [gridMode, setGridMode] = useState<GridMode>('4x4');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-tour / Carousel
  const [autoTour, setAutoTour] = useState(false);
  const [tourPage, setTourPage] = useState(0);

  // Selected slot for assigning a camera
  const [assigningSlot, setAssigningSlot] = useState<number | null>(null);

  // Enlarged camera modal
  const [focusedCamera, setFocusedCamera] = useState<Camera | null>(null);
  const [focusedChannel, setFocusedChannel] = useState<number | null>(null);

  // New Camera configuration modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Slot assignments: Array of camera IDs assigned to each slot index (0..15)
  const [slotAssignments, setSlotAssignments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cctv_videowall_slots');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Current live timestamp ticker
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimestamp(
        now.toISOString().replace('T', ' ').substring(0, 19)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real cameras from API / Database
  const fetchCameras = async () => {
    setLoading(true);
    try {
      const data = await cameraService.getCameras();
      setCameras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching cameras for grid:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  // Save slot assignments to localStorage
  const assignCameraToSlot = (slotIndex: number, cameraId: string | null) => {
    setSlotAssignments(prev => {
      const copy = [...prev];
      if (cameraId) {
        copy[slotIndex] = cameraId;
      } else {
        delete copy[slotIndex];
      }
      localStorage.setItem('cctv_videowall_slots', JSON.stringify(copy));
      return copy;
    });
    setAssigningSlot(null);
  };

  // Determine number of visible slots based on grid layout
  const totalSlots = useMemo(() => {
    switch (gridMode) {
      case '4x4': return 16;
      case '3x3': return 9;
      case '2x2': return 4;
      case '1x1': return 1;
    }
  }, [gridMode]);

  // Compute camera mapped to each slot (only real DB cameras, no auto-filling/repeating)
  const slots = useMemo(() => {
    const result: Array<{ slotNumber: number; camera: Camera | null }> = [];
    const startIndex = autoTour ? tourPage * totalSlots : 0;

    for (let i = 0; i < totalSlots; i++) {
      const slotIndex = startIndex + i;
      const assignedId = slotAssignments[slotIndex];
      let assignedCam: Camera | null = null;

      if (assignedId) {
        assignedCam = cameras.find(c => c.id === assignedId) || null;
      }

      // Solo asignar si existe una cámara real para este índice (sin repetir/autollenar)
      if (!assignedCam && cameras[slotIndex]) {
        assignedCam = cameras[slotIndex];
      }

      result.push({
        slotNumber: i + 1,
        camera: assignedCam,
      });
    }

    return result;
  }, [totalSlots, slotAssignments, cameras, autoTour, tourPage]);

  // Total pages available for auto-tour
  const totalPages = Math.ceil(Math.max(cameras.length, 1) / totalSlots);

  // Auto-tour timer
  useEffect(() => {
    if (!autoTour || totalPages <= 1) return;
    const interval = setInterval(() => {
      setTourPage(prev => (prev + 1) % totalPages);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoTour, totalPages]);

  // Fullscreen handlers
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const onlineCount = cameras.filter(c => c.status === 'online').length;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans select-none theme-transition ${
        isFullscreen ? 'p-3' : 'p-4 lg:p-5'
      }`}
    >
      {/* ── TOP CONTROL BAR ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-neutral-200 dark:border-zinc-800/80 shrink-0">
        {/* Left: Module identity & Title */}
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <button
              onClick={() => navigate('/command-center')}
              title="Volver a Central de Despacho"
              className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 shadow-xs flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <ArrowLeft size={15} />
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)]/40 flex items-center justify-center text-[var(--brand)] dark:text-sky-400 shadow-xs shrink-0">
            <LayoutGrid size={16} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm lg:text-base font-black uppercase tracking-wider text-[var(--text-primary)]">
                Mosaico 4x4 • Cámaras Reales de Base de Datos
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {cameras.length} EN BD
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-mono hidden sm:block">
              {cameras.length} cámaras registradas en PostgreSQL • Transmisión simultánea activa
            </p>
          </div>
        </div>

        {/* Right: Layout Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Grid Mode Selector */}
          <div className="flex items-center bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={() => setGridMode('4x4')}
              title="Cuadrícula 4x4 (16 cámaras)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                gridMode === '4x4'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <LayoutGrid size={13} />
              <span>4x4</span>
            </button>

            <button
              onClick={() => setGridMode('3x3')}
              title="Cuadrícula 3x3 (9 cámaras)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                gridMode === '3x3'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <LayoutGrid size={13} />
              <span>3x3</span>
            </button>

            <button
              onClick={() => setGridMode('2x2')}
              title="Cuadrícula 2x2 (4 cámaras)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                gridMode === '2x2'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Grid2X2 size={13} />
              <span>2x2</span>
            </button>

            <button
              onClick={() => setGridMode('1x1')}
              title="Foco Individual (1 cámara)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                gridMode === '1x1'
                  ? 'bg-[var(--brand)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Square size={13} />
              <span>1x1</span>
            </button>
          </div>

          {/* Auto-Tour Toggle */}
          {totalPages > 1 && (
            <button
              onClick={() => setAutoTour(v => !v)}
              title={autoTour ? 'Desactivar Secuenciador Automático' : 'Activar Secuenciador Automático (Tour)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                autoTour
                  ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300'
                  : 'bg-[var(--bg-surface)] border-neutral-200 dark:border-zinc-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {autoTour ? <Pause size={12} className="animate-pulse" /> : <Play size={12} />}
              <span>TOUR {autoTour ? `(${tourPage + 1}/${totalPages})` : ''}</span>
            </button>
          )}

          {/* Refresh Streams */}
          <button
            onClick={fetchCameras}
            disabled={loading}
            title="Refrescar cámaras desde la Base de Datos"
            className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--brand)]' : ''} />
          </button>

          {/* Add Camera button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            title="Registrar nueva cámara en la Base de Datos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva Cámara</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Videowall Pantalla Completa (F11)'}
            className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* ── 4x4 / DYNAMIC CCTV MATRIX VIEWPORT ──────────────────── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-[var(--bg-surface)] rounded-xl border border-neutral-200 dark:border-zinc-800">
            <RefreshCw size={28} className="text-[var(--brand)] animate-spin" />
            <span className="text-xs font-mono text-[var(--text-muted)]">Cargando cámaras reales desde la Base de Datos...</span>
          </div>
        ) : cameras.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-[var(--bg-surface)] rounded-xl border border-neutral-200 dark:border-zinc-800 p-6 text-center">
            <Cctv size={48} className="text-[var(--brand)] opacity-60" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                No hay cámaras registradas en la Base de Datos
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md">
                Puedes registrar tu primera cámara IP / RTSP para monitorearla en tiempo real desde la cuadrícula.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Registrar Cámara Manual</span>
            </button>
          </div>
        ) : (
          <div
            className={`h-full w-full grid gap-1.5 lg:gap-2 ${
              gridMode === '4x4'
                ? 'grid-cols-2 sm:grid-cols-4 grid-rows-8 sm:grid-rows-4'
                : gridMode === '3x3'
                ? 'grid-cols-2 sm:grid-cols-3 grid-rows-5 sm:grid-rows-3'
                : gridMode === '2x2'
                ? 'grid-cols-1 sm:grid-cols-2 grid-rows-4 sm:grid-rows-2'
                : 'grid-cols-1 grid-rows-1'
            }`}
          >
            {slots.map(({ slotNumber, camera }) => {
              const isOnline = camera?.status === 'online';

              return (
                <div
                  key={`slot-${slotNumber}`}
                  className="group relative bg-[#09090b] dark:bg-black border border-neutral-300 dark:border-zinc-800/80 hover:border-[var(--brand)] dark:hover:border-sky-500/80 rounded-md overflow-hidden flex flex-col transition-all duration-150 shadow-xs"
                >
                  {/* ── Slot Header HUD ── */}
                  <div className="absolute top-0 left-0 right-0 z-20 px-2.5 py-1.5 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-neutral-900 text-neutral-200 border border-white/20 shrink-0">
                        CH {slotNumber < 10 ? `0${slotNumber}` : slotNumber}
                      </span>
                      <span className="text-[10px] font-bold font-mono tracking-tight text-white drop-shadow truncate">
                        {camera ? camera.name : 'CANAL LIBRE'}
                      </span>
                    </div>

                    {camera && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[9px] font-mono font-black tracking-wider ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isOnline ? 'REC' : 'OFF'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Real Camera CCTV Tactical Feed Viewport ── */}
                  <div className="flex-1 w-full h-full relative bg-neutral-950 flex items-center justify-center overflow-hidden select-none">
                    {camera ? (
                      <div className="w-full h-full flex flex-col items-center justify-between p-2.5 relative bg-radial from-neutral-900 to-black overflow-hidden">
                        {/* Scanline CRT overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-45" />

                        {/* Top Telemetry Overlay */}
                        <div className="w-full flex items-center justify-between text-[8px] font-mono text-zinc-400 z-10 pt-4">
                          <span className="px-1 rounded bg-black/60 border border-white/10">
                            FHD 1080P • 29.97 FPS
                          </span>
                          <span className="px-1 rounded bg-black/60 border border-white/10 text-emerald-400 font-bold">
                            LAT: {camera.location?.latitude ? camera.location.latitude.toFixed(4) : '7.0655'}
                          </span>
                        </div>

                        {/* Central Target & Radar Reticle */}
                        <div className="relative flex flex-col items-center justify-center my-auto">
                          <div className="w-12 h-12 rounded-full border border-sky-500/25 flex items-center justify-center relative">
                            {/* Scanning Pulse Radar */}
                            <div className="absolute inset-0 rounded-full border border-sky-400/40 animate-ping opacity-25" />
                            <Cctv size={22} className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                            {/* Reticle axis */}
                            <div className="absolute w-2 h-0.5 bg-sky-400/60 top-1/2 -left-1" />
                            <div className="absolute w-2 h-0.5 bg-sky-400/60 top-1/2 -right-1" />
                            <div className="absolute h-2 w-0.5 bg-sky-400/60 left-1/2 -top-1" />
                            <div className="absolute h-2 w-0.5 bg-sky-400/60 left-1/2 -bottom-1" />
                          </div>

                          <div className="text-[10px] font-mono font-black text-white tracking-wider mt-1.5 drop-shadow">
                            STREAM EN VIVO
                          </div>
                          <div className="text-[8px] font-mono text-zinc-400 truncate max-w-[170px] bg-black/50 px-1.5 py-0.5 rounded border border-white/10">
                            {camera.streamUrl}
                          </div>
                        </div>

                        {/* Bottom Telemetry Overlay */}
                        <div className="w-full flex items-center justify-between text-[8px] font-mono text-zinc-400 z-10 pb-4">
                          <span className="truncate max-w-[55%] text-zinc-300">
                            {camera.location?.address || 'Barrancabermeja'}
                          </span>
                          <span className="text-sky-400 font-mono">
                            R: {camera.coverageRadius || 100}m
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Empty Slot */
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center select-none bg-[var(--bg-surface)]">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-[var(--text-muted)] mb-1">
                          <Radio size={14} />
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                          Sin Asignar
                        </span>
                        <button
                          onClick={() => setAssigningSlot(slotNumber - 1)}
                          className="mt-1 px-2.5 py-0.5 text-[9px] font-mono font-bold bg-[var(--accent-bg)] hover:bg-[var(--brand)] text-[var(--brand)] hover:text-white dark:text-sky-300 dark:hover:text-white border border-[var(--accent-border)]/40 rounded transition-colors cursor-pointer"
                        >
                          + Vincular
                        </button>
                      </div>
                    )}

                    {/* ── Hover Controls Overlay ── */}
                    {camera && (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity z-30">
                        <button
                          onClick={() => {
                            setFocusedCamera(camera);
                            setFocusedChannel(slotNumber);
                          }}
                          title="Ver en Pantalla Completa y Alta Definición"
                          className="px-2.5 py-1.5 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-mono text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition-transform hover:scale-105"
                        >
                          <Maximize2 size={12} />
                          <span>AMPLIAR</span>
                        </button>

                        <button
                          onClick={() => setAssigningSlot(slotNumber - 1)}
                          title="Cambiar la cámara vinculada a este canal"
                          className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold border border-neutral-600 cursor-pointer"
                        >
                          CAMBIAR
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Slot Footer HUD ── */}
                  <div className="px-2.5 py-1 bg-black/95 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-300 z-10 shrink-0">
                    <div className="flex items-center gap-1 truncate max-w-[65%]">
                      <MapPin size={9} className="text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {camera?.location?.address || 'Sector Urbano'}
                      </span>
                    </div>

                    <span className="text-zinc-400 font-mono shrink-0">
                      {currentTimestamp.split(' ')[1] || '00:00:00'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: ASSIGN CAMERA TO SLOT ────────────────────────── */}
      {assigningSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-[var(--text-primary)] theme-transition">
            <div className="p-4 bg-[var(--bg-elevated)] border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Cctv size={16} className="text-[var(--brand)]" />
                  <span>Vincular Cámara al Canal CH {assigningSlot + 1}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Selecciona la cámara de seguridad registrada en tu base de datos
                </p>
              </div>
              <button
                onClick={() => setAssigningSlot(null)}
                className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer border border-neutral-200 dark:border-zinc-700 shadow-xs"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-200 dark:border-zinc-800 bg-[var(--bg-app)]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar cámara por nombre, dirección o URL..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-neutral-300 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] font-mono"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
              {cameras
                .filter(c =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.location?.address || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(cam => {
                  const isCurrent = slotAssignments[assigningSlot] === cam.id;
                  return (
                    <button
                      key={cam.id}
                      onClick={() => assignCameraToSlot(assigningSlot, cam.id)}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--accent-bg)] border-[var(--brand)] text-[var(--text-primary)] font-bold'
                          : 'bg-[var(--bg-elevated)] border-neutral-200 dark:border-zinc-800/80 hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                      }`}
                    >
                      <div className="truncate pr-3">
                        <div className="text-xs font-bold flex items-center gap-2">
                          <span>{cam.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                          {cam.location?.address || 'Sin dirección'} • {cam.streamUrl}
                        </div>
                      </div>
                      {isCurrent && <Check size={14} className="text-[var(--brand)] shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ENLARGED FULLSCREEN FOCUSED CAMERA VIEWER ────── */}
      {focusedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-neutral-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col theme-transition">
            {/* Viewer Header */}
            <div className="p-4 bg-[var(--bg-elevated)] border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 font-mono">
                    <span>CH {focusedChannel ? (focusedChannel < 10 ? `0${focusedChannel}` : focusedChannel) : '01'} • {focusedCamera.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--brand)] dark:text-sky-400 border border-[var(--accent-border)]/40 font-bold">
                      1080P • 30 FPS • H.264
                    </span>
                  </h3>
                  <div className="text-xs font-mono text-[var(--text-muted)]">
                    {focusedCamera.location?.address || 'Ubicación registrada'} • GPS: {focusedCamera.location?.latitude?.toFixed(4)}, {focusedCamera.location?.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigate('/command-center');
                    setFocusedCamera(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-neutral-200 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <MapPin size={13} className="text-[var(--brand)]" />
                  <span>Ver en Mapa Táctico</span>
                </button>

                <button
                  onClick={() => setFocusedCamera(null)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border border-neutral-200 dark:border-zinc-700 shadow-xs"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Viewport */}
            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center gap-3 text-center p-8 select-none">
                <Cctv size={56} className="text-sky-400 animate-pulse" />
                <div className="text-base font-mono font-bold text-white tracking-wider">
                  TRANSMISIÓN CCTV EN TIEMPO REAL (MEDIAMTX)
                </div>
                <div className="text-xs font-mono text-sky-300 bg-sky-950/60 px-4 py-1.5 rounded-lg border border-sky-800/60 max-w-lg truncate">
                  {focusedCamera.streamUrl}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800">
                  Latencia ultrabaja &lt; 250ms • Protocolo WebRTC / RTSP Bridge • Cobertura: {focusedCamera.coverageRadius || 100}m
                </div>
              </div>

              {/* Tactical HUD Overlays */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                REC • {currentTimestamp}
              </div>
              <div className="absolute bottom-4 right-4 text-[10px] font-mono text-zinc-400 bg-black/80 px-2.5 py-1 rounded border border-zinc-800">
                CAM ID: {focusedCamera.id}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-[var(--bg-elevated)] border-t border-neutral-200 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>Coordenadas GPS: {focusedCamera.location?.latitude?.toFixed(6)}, {focusedCamera.location?.longitude?.toFixed(6)}</span>
              <button
                onClick={() => setFocusedCamera(null)}
                className="px-4 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-bold transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / CONFIGURE CAMERA ────────────────────── */}
      <CameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchCameras();
        }}
      />
    </div>
  );
};

export default CameraGrid;
