import { useState } from 'react'
import { API_URL } from '../config'
import './Login.css'

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    passwordConfirm: '',
    rol: 'operador'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  const EyeIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12c2.6-4.2 6.6-6.5 10-6.5s7.4 2.3 10 6.5c-2.6 4.2-6.6 6.5-10 6.5s-7.4-2.3-10-6.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
  const isDemo = new URLSearchParams(window.location.search).get('demo') === '1'

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isDemo) {
      const demoUser = { nombre: formData.email.split('@')[0] || 'Demo', email: formData.email, rol: 'admin' }
      onLogin(demoUser, 'demo-token')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (data.success) {
        onLogin(data.user, data.token)
      } else {
        setError(data.message || 'Error al iniciar sesión')
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.passwordConfirm) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (isDemo) {
      const demoUser = { nombre: formData.nombre || 'Usuario Demo', email: formData.email, rol: formData.rol }
      onLogin(demoUser, 'demo-token')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          rol: formData.rol
        })
      })

      const data = await response.json()

      if (data.success) {
        onLogin(data.user, data.token)
      } else {
        setError(data.message || 'Error al crear cuenta')
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-header-group">
        <div className="login-logo-box">📦</div>
        <h1 className="login-main-title">Control de Inventario</h1>
        <p className="login-subtitle">Inicia sesión en tu cuenta</p>
      </div>

      <div className="login-card">
        <div className="login-tabs">
          <button
            className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Iniciar Sesión
          </button>
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Crear Cuenta
          </button>
        </div>

        {error && (
          <div className="login-error">
            ⚠️ {error}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-field">
              <input
                type="email"
                name="email"
                className="styled-input"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Correo electrónico"
              />
            </div>

            <div className="input-field">
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                className="styled-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Contraseña"
              />
              <span className="password-eye" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Ocultar' : 'Mostrar'}>
                <EyeIcon />
              </span>
            </div>

            <div className="login-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                <span className="checkmark"></span>
                Recordarme
              </label>
              <a href="#" className="forgot-password-link">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="login-form">
            <div className="input-field">
              <input
                type="text"
                name="nombre"
                className="styled-input"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Nombre completo"
              />
            </div>

            <div className="input-field">
              <input
                type="email"
                name="email"
                className="styled-input"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Correo electrónico"
              />
            </div>

            <div className="input-field">
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                className="styled-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Contraseña"
              />
              <span className="password-eye" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Ocultar' : 'Mostrar'}>
                <EyeIcon />
              </span>
            </div>

            <div className="input-field">
              <input
                type={showPwdConfirm ? 'text' : 'password'}
                name="passwordConfirm"
                className="styled-input"
                value={formData.passwordConfirm}
                onChange={handleChange}
                required
                placeholder="Confirmar contraseña"
              />
              <span className="password-eye" onClick={() => setShowPwdConfirm(v => !v)} title={showPwdConfirm ? 'Ocultar' : 'Mostrar'}>
                <EyeIcon />
              </span>
            </div>

            <div className="role-selection">
              <label className="role-chip">
                <input
                  type="radio"
                  name="rol"
                  value="operador"
                  checked={formData.rol === 'operador'}
                  onChange={handleChange}
                />
                <span>Operador</span>
              </label>
              <label className="role-chip">
                <input
                  type="radio"
                  name="rol"
                  value="carpintero"
                  checked={formData.rol === 'carpintero'}
                  onChange={handleChange}
                />
                <span>Carpintero</span>
              </label>
              <label className="role-chip">
                <input
                  type="radio"
                  name="rol"
                  value="admin"
                  checked={formData.rol === 'admin'}
                  onChange={handleChange}
                />
                <span>Admin</span>
              </label>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
        )}
      </div>

      <div className="login-footer-text">
        © 2026 Inventario - Jonas. Todos los derechos reservados.
      </div>
    </div>
  )
}
