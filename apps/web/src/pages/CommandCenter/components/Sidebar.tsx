import React, { useState, useMemo } from 'react';
// @ts-ignore
import { FixedSizeList as List } from 'react-window';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';
import type { Camera } from '../../../services/cameras';

interface SidebarProps {
  cameras: Camera[];
  alerts: any[];
  onSelectCamera: (cam: Camera) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ cameras, alerts, onSelectCamera }) => {
  const [activeTab, setActiveTab] = useState<'cameras' | 'events'>('cameras');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCameras = useMemo(() => {
    return cameras.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cameras, searchTerm]);

  // Virtualized row renderer for Cameras
  const CameraRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const cam = filteredCameras[index];
    const isOnline = cam.status === 'online';
    
    return (
      <div 
        style={{ 
          ...style, 
          padding: '10px 15px', 
          borderBottom: '1px solid #4a5568',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          backgroundColor: index % 2 === 0 ? '#2d3748' : '#2a3342'
        }}
        onClick={() => onSelectCamera(cam)}
      >
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: isOnline ? '#48bb78' : '#e53e3e',
          flexShrink: 0
        }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {cam.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a0aec0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {cam.location.address}
          </div>
        </div>
        <button style={{
          background: 'transparent', border: '1px solid #4a5568', color: '#cbd5e0',
          borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer'
        }}>
          Ver
        </button>
      </div>
    );
  };

  // Virtualized row renderer for Events
  const EventRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const alert = alerts[index];
    
    return (
      <div style={{ 
        ...style, 
        padding: '10px 15px', 
        borderBottom: '1px solid #4a5568',
        boxSizing: 'border-box',
        backgroundColor: '#2d3748'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ 
            color: '#fc8181', fontWeight: 'bold', fontSize: '0.85rem',
            textTransform: 'uppercase'
          }}>🚨 {alert.type}</span>
          <span style={{ color: '#a0aec0', fontSize: '0.75rem' }}>
            {new Date(alert.createdAt).toLocaleTimeString()}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{alert.description || 'Sin descripción'}</div>
        <div style={{ fontSize: '0.7rem', color: '#a0aec0', marginTop: '4px' }}>📍 {alert.location.address}</div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #4a5568' }}>
        <button 
          onClick={() => setActiveTab('cameras')}
          style={{
            flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === 'cameras' ? '#4a5568' : '#2d3748',
            color: activeTab === 'cameras' ? '#fff' : '#a0aec0',
            fontWeight: activeTab === 'cameras' ? 'bold' : 'normal',
            borderBottom: activeTab === 'cameras' ? '2px solid #63b3ed' : 'none'
          }}
        >
          📹 Cámaras ({filteredCameras.length})
        </button>
        <button 
          onClick={() => setActiveTab('events')}
          style={{
            flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
            backgroundColor: activeTab === 'events' ? '#4a5568' : '#2d3748',
            color: activeTab === 'events' ? '#fff' : '#a0aec0',
            fontWeight: activeTab === 'events' ? 'bold' : 'normal',
            borderBottom: activeTab === 'events' ? '2px solid #fc8181' : 'none'
          }}
        >
          🚨 Eventos ({alerts.length})
        </button>
      </div>

      {/* Search (only for cameras) */}
      {activeTab === 'cameras' && (
        <div style={{ padding: '10px', borderBottom: '1px solid #4a5568' }}>
          <input 
            type="text" 
            placeholder="Buscar cámara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '4px',
              border: '1px solid #4a5568', backgroundColor: '#1a202c', color: '#fff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Virtualized List Container */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              height={height}
              itemCount={activeTab === 'cameras' ? filteredCameras.length : alerts.length}
              itemSize={activeTab === 'cameras' ? 65 : 85}
              width={width}
            >
              {activeTab === 'cameras' ? CameraRow : EventRow}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default Sidebar;
