import { useState } from 'react';
import { authService } from '../services/auth';
import './Login.css';

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });
      
      if (response.success) {
        // Guardar token y userId y rol
        authService.setToken(response.data.token, response.data.user.id, response.data.user.role);
        // Llamar a onLogin para redirigir al mapa
        onLogin();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Red Ciudadana de Seguridad</h1>
        <h2>Iniciar Sesión</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <button
          type="button"
          onClick={() => {
            setEmail('admin@redciudadana.org');
            setPassword('password123');
          }}
          style={{
            marginBottom: '1rem',
            backgroundColor: '#1e293b',
            border: '1px solid #06b6d4',
            color: '#38bdf8',
            padding: '0.6rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 600,
            width: '100%'
          }}
        >
          ⚡ Autocompletar Operador / Admin
        </button>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            Terminal exclusiva para personal policial y operadores.
          </p>
          <p style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
            ¿Eres ciudadano? <a href="/register" style={{ color: '#38bdf8', fontWeight: 'bold', textDecoration: 'underline' }}>Información de registro móvil</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;