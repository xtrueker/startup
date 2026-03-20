import { useState } from 'react';
import { authService } from '../services/auth';
import './Login.css'; // Reusamos los estilos

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    cedula: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validar cédula (solo números, 6-10 dígitos)
    if (!/^\d{6,10}$/.test(formData.cedula)) {
      setError('La cédula debe tener entre 6 y 10 dígitos numéricos');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.register({
        fullName: formData.fullName,
        cedula: formData.cedula,
        email: formData.email,
        password: formData.password,
        role: 'citizen',
      });

      if (response.success) {
        authService.setToken(response.data.token, response.data.user.id, response.data.user.role);
        setSuccess('¡Registro exitoso! Bienvenido ' + response.data.user.fullName);
        
        // Limpiar formulario
        setFormData({
          fullName: '',
          cedula: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Red Ciudadana de Seguridad</h1>
        <h2>Crear Cuenta</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre Completo:</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Juan Pérez"
            />
          </div>

          <div className="form-group">
            <label>Cédula:</label>
            <input
              type="text"
              name="cedula"
              value={formData.cedula}
              onChange={handleChange}
              required
              placeholder="1234567890"
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña:</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="register-link">
          ¿Ya tienes cuenta? <a href="/login">Inicia sesión aquí</a>
        </p>
      </div>
    </div>
  );
}

export default Register;
