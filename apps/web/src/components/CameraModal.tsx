import './CameraModal.css';

interface CameraModalProps {
  camera: {
    id: string;
    name: string;
    streamUrl: string;
    location: {
      address: string;
    };
    status: string;
  };
  onClose: () => void;
}

function CameraModal({ camera, onClose }: CameraModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📹 {camera.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="video-container">
          {camera.streamUrl ? (
            <iframe
              src={camera.streamUrl}
              title={camera.name}
              width="100%"
              height="400"
              frameBorder="0"
              allowFullScreen
            />
          ) : (
            <div className="no-video">No hay stream disponible</div>
          )}
        </div>

        <div className="modal-info">
          <p><strong>📍 Ubicación:</strong> {camera.location.address}</p>
          <p>
            <strong>Estado:</strong>{' '}
            <span className={camera.status === 'online' ? 'online' : 'offline'}>
              {camera.status === 'online' ? '🟢 En línea' : '🔴 Fuera de línea'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default CameraModal;