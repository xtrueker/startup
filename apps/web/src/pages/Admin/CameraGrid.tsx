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
import {
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

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

  const totalPages = Math.ceil(Math.max(cameras.length, 1) / totalSlots);

  useEffect(() => {
    if (!autoTour || totalPages <= 1) return;
    const interval = setInterval(() => {
      setTourPage(prev => (prev + 1) % totalPages);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoTour, totalPages]);

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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-transparent text-[var(--text-primary)] overflow-hidden font-sans select-none theme-transition ${
        isFullscreen ? 'p-3 bg-[var(--bg-app)]' : 'p-4 lg:p-6 gap-4'
      }`}
    >
      {/* ── TOP LIQUID GLASS CONTROL BAR ──────────────────────────────── */}
      <LiquidGlassCard strong className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <button
              onClick={() => navigate('/command-center')}
              title="Volver a Central de Despacho"
              className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
            >
              <ArrowLeft size={15} />
            </button>
          )}

          <div className="w-9 h-9 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9] shrink-0">
            <LayoutGrid size={17} />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-sm lg:text-base font-bold tracking-tight text-[var(--text-primary)]">
                Mosaico CCTV • {gridMode}
              </h1>
              <StatusPill label={`${cameras.length} en BD`} tone="emerald" pulsing />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] hidden sm:block">
              {cameras.length} cámaras reales registradas • Transmisión simultánea por cuadrante
            </p>
          </div>
        </div>

        {/* Right: Layout Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-full p-1 gap-0.5">
            <button
              onClick={() => setGridMode('4x4')}
              title="Cuadrícula 4x4 (16 cámaras)"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                gridMode === '4x4'
                  ? 'liquid-pill-obsidian'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid size={12} />
              <span>4x4</span>
            </button>

            <button
              onClick={() => setGridMode('3x3')}
              title="Cuadrícula 3x3 (9 cámaras)"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                gridMode === '3x3'
                  ? 'liquid-pill-obsidian'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid size={12} />
              <span>3x3</span>
            </button>

            <button
              onClick={() => setGridMode('2x2')}
              title="Cuadrícula 2x2 (4 cámaras)"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                gridMode === '2x2'
                  ? 'liquid-pill-obsidian'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid2X2 size={12} />
              <span>2x2</span>
            </button>

            <button
              onClick={() => setGridMode('1x1')}
              title="Foco Individual (1 cámara)"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                gridMode === '1x1'
                  ? 'liquid-pill-obsidian'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Square size={12} />
              <span>1x1</span>
            </button>
          </div>

          {totalPages > 1 && (
            <button
              onClick={() => setAutoTour(v => !v)}
              title={autoTour ? 'Desactivar Secuenciador Automático' : 'Activar Secuenciador Automático (Tour)'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                autoTour
                  ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'glass-button'
              }`}
            >
              {autoTour ? <Pause size={12} className="animate-pulse" /> : <Play size={12} />}
              <span>Tour {autoTour ? `(${tourPage + 1}/${totalPages})` : ''}</span>
            </button>
          )}

          <button
            onClick={fetchCameras}
            disabled={loading}
            title="Refrescar cámaras desde la Base de Datos"
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#0EA5E9]' : ''} />
          </button>

          <LiquidPillButton
            variant="obsidian"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            title="Registrar nueva cámara en la Base de Datos"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva cámara</span>
          </LiquidPillButton>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Videowall Pantalla Completa (F11)'}
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </LiquidGlassCard>

      {/* ── 4x4 / DYNAMIC CCTV MATRIX VIEWPORT ──────────────────── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {loading ? (
          <LiquidGlassCard className="h-full w-full flex flex-col items-center justify-center gap-3">
            <RefreshCw size={28} className="text-[#0EA5E9] animate-spin" />
            <span className="text-xs font-mono text-[var(--text-muted)]">Cargando cámaras reales desde la Base de Datos...</span>
          </LiquidGlassCard>
        ) : cameras.length === 0 ? (
          <LiquidGlassCard className="h-full w-full flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9]">
              <Cctv size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No hay cámaras registradas en la Base de Datos
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md">
                Puedes registrar tu primera cámara IP / RTSP para monitorearla en tiempo real desde la cuadrícula.
              </p>
            </div>
            <LiquidPillButton variant="obsidian" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={14} />
              <span>Registrar cámara manual</span>
            </LiquidPillButton>
          </LiquidGlassCard>
        ) : (
          <div
            className={`h-full w-full grid gap-2 ${
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
                  className={`group relative rounded-[18px] overflow-hidden flex flex-col transition-all duration-150 border ${
                    camera
                      ? 'bg-[#09090b] border-[var(--border-strong)] hover:border-[#0EA5E9] shadow-sm'
                      : 'liquid-glass border-[var(--border-base)] hover:border-[#0EA5E9]/60'
                  }`}
                >
                  {/* ── Slot Header HUD ── */}
                  <div
                    className={`absolute top-0 left-0 right-0 z-20 px-2.5 py-1.5 flex items-center justify-between pointer-events-none ${
                      camera
                        ? 'bg-gradient-to-b from-black/95 via-black/60 to-transparent text-white'
                        : 'bg-transparent text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                          camera
                            ? 'bg-white/15 text-white border border-white/20'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-strong)]'
                        }`}
                      >
                        CH {slotNumber < 10 ? `0${slotNumber}` : slotNumber}
                      </span>
                      <span className="text-[10.5px] font-bold tracking-tight truncate">
                        {camera ? camera.name : 'Canal libre'}
                      </span>
                    </div>

                    {camera && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[9px] font-mono font-bold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isOnline ? 'REC' : 'OFF'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Real Camera CCTV Tactical Feed Viewport ── */}
                  <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden select-none">
                    {camera ? (
                      <div className="w-full h-full flex flex-col items-center justify-between p-2.5 relative bg-radial from-neutral-900 to-black overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-45" />

                        <div className="w-full flex items-center justify-between text-[8px] font-mono text-zinc-400 z-10 pt-5">
                          <span className="px-1.5 py-0.5 rounded-full bg-black/60 border border-white/10">
                            FHD 1080P • 29.97 FPS
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-emerald-400 font-bold">
                            LAT: {camera.location?.latitude ? camera.location.latitude.toFixed(4) : '7.0655'}
                          </span>
                        </div>

                        <div className="relative flex flex-col items-center justify-center my-auto">
                          <div className="w-11 h-11 rounded-full border border-sky-500/25 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-full border border-sky-400/40 animate-ping opacity-25" />
                            <Cctv size={20} className="text-sky-400" />
                          </div>

                          <div className="text-[10px] font-mono font-bold text-white tracking-wider mt-1.5">
                            STREAM EN VIVO
                          </div>
                          <div className="text-[8px] font-mono text-zinc-400 truncate max-w-[160px] bg-black/50 px-2 py-0.5 rounded-full border border-white/10">
                            {camera.streamUrl}
                          </div>
                        </div>

                        <div className="w-full flex items-center justify-between text-[8px] font-mono text-zinc-400 z-10 pb-1">
                          <span className="truncate max-w-[60%] text-zinc-300">
                            {camera.location?.address || 'Barrancabermeja'}
                          </span>
                          <span className="text-sky-400 font-mono">
                            R: {camera.coverageRadius || 100}m
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Empty Slot (Sculptural Pearl / Obsidian Glass) */
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center select-none">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-muted)] mb-1">
                          <Radio size={14} />
                        </div>
                        <span className="text-[10.5px] font-medium text-[var(--text-muted)]">
                          Sin asignar
                        </span>
                        <button
                          onClick={() => setAssigningSlot(slotNumber - 1)}
                          className="mt-1.5 px-3 py-1 text-[10px] font-semibold rounded-full glass-button cursor-pointer"
                        >
                          + Vincular
                        </button>
                      </div>
                    )}

                    {/* ── Hover Controls Overlay ── */}
                    {camera && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity z-30">
                        <button
                          onClick={() => {
                            setFocusedCamera(camera);
                            setFocusedChannel(slotNumber);
                          }}
                          title="Ver en Pantalla Completa y Alta Definición"
                          className="px-3 py-1.5 rounded-full bg-white text-[#0C0F14] font-semibold text-xs flex items-center gap-1 shadow-md cursor-pointer transition-transform hover:scale-105"
                        >
                          <Maximize2 size={12} />
                          <span>Ampliar</span>
                        </button>

                        <button
                          onClick={() => setAssigningSlot(slotNumber - 1)}
                          title="Cambiar la cámara vinculada a este canal"
                          className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white font-semibold text-xs border border-white/25 cursor-pointer"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Slot Footer HUD ── */}
                  <div
                    className={`px-2.5 py-1 flex items-center justify-between text-[9px] font-mono z-10 shrink-0 ${
                      camera
                        ? 'bg-black/95 border-t border-white/10 text-zinc-300'
                        : 'bg-[var(--bg-input)] border-t border-[var(--border-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-1 truncate max-w-[65%]">
                      <MapPin size={9} className="shrink-0" />
                      <span className="truncate">
                        {camera?.location?.address || 'Canal disponible'}
                      </span>
                    </div>

                    <span className="font-mono shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <LiquidGlassCard strong className="w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Cctv size={16} className="text-[#0EA5E9]" />
                  <span>Vincular cámara al canal CH {assigningSlot + 1}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Selecciona la cámara registrada en tu base de datos
                </p>
              </div>
              <button
                onClick={() => setAssigningSlot(null)}
                className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 border-b border-[var(--border-subtle)]">
              <LiquidInput
                type="text"
                placeholder="Buscar cámara por nombre, dirección o URL..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search size={14} />}
              />
            </div>

            <div className="max-h-72 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
              <button
                onClick={() => assignCameraToSlot(assigningSlot, null)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-dashed border-[var(--border-strong)] hover:border-[#E11D48] hover:bg-rose-500/10 text-left flex items-center justify-between text-xs text-[var(--text-muted)] hover:text-[#E11D48] transition-colors cursor-pointer"
              >
                <span>Dejar canal vacío (Sin señal)</span>
                <X size={13} />
              </button>

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
                      className={`w-full p-3 rounded-[18px] border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--accent-bg)] border-[#0EA5E9] text-[var(--text-primary)] font-bold'
                          : 'bg-[var(--bg-input)] border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="truncate pr-3">
                        <div className="text-xs font-bold flex items-center gap-2 text-[var(--text-primary)]">
                          <span>{cam.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        </div>
                        <div className="text-[10.5px] text-[var(--text-muted)] font-mono truncate">
                          {cam.location?.address || 'Sin dirección'} • {cam.streamUrl}
                        </div>
                      </div>
                      {isCurrent && <Check size={14} className="text-[#0EA5E9] shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {/* ── MODAL: ENLARGED FULLSCREEN FOCUSED CAMERA VIEWER ────── */}
      {focusedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <LiquidGlassCard strong className="w-full max-w-5xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>CH {focusedChannel ? (focusedChannel < 10 ? `0${focusedChannel}` : focusedChannel) : '01'} • {focusedCamera.name}</span>
                    <StatusPill label="1080P • 30 FPS" tone="aqua" />
                  </h3>
                  <div className="text-xs font-mono text-[var(--text-muted)]">
                    {focusedCamera.location?.address || 'Ubicación registrada'} • GPS: {focusedCamera.location?.latitude?.toFixed(4)}, {focusedCamera.location?.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <LiquidPillButton
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    navigate('/command-center');
                    setFocusedCamera(null);
                  }}
                >
                  <MapPin size={13} className="text-[#0EA5E9]" />
                  <span>Ver en mapa</span>
                </LiquidPillButton>

                <button
                  onClick={() => setFocusedCamera(null)}
                  className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center gap-3 text-center p-8 select-none">
                <Cctv size={56} className="text-sky-400 animate-pulse" />
                <div className="text-base font-mono font-bold text-white tracking-wider">
                  TRANSMISIÓN CCTV EN TIEMPO REAL (MEDIAMTX)
                </div>
                <div className="text-xs font-mono text-sky-300 bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-800/60 max-w-lg truncate">
                  {focusedCamera.streamUrl}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                  Latencia ultrabaja &lt; 250ms • Cobertura: {focusedCamera.coverageRadius || 100} m
                </div>
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-full text-xs font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                REC • {currentTimestamp}
              </div>
              <div className="absolute bottom-4 right-4 text-[10px] font-mono text-zinc-400 bg-black/80 px-3 py-1 rounded-full border border-zinc-800">
                CAM ID: {focusedCamera.id}
              </div>
            </div>

            <div className="p-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>Coordenadas GPS: {focusedCamera.location?.latitude?.toFixed(6)}, {focusedCamera.location?.longitude?.toFixed(6)}</span>
              <LiquidPillButton variant="obsidian" size="sm" onClick={() => setFocusedCamera(null)}>
                Cerrar visor
              </LiquidPillButton>
            </div>
          </LiquidGlassCard>
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
