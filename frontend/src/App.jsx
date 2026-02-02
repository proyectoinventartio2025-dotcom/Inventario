import { useState, useEffect } from 'react'
import { API_URL } from './config'
import Login from './components/Login'
import DashboardAdmin from './components/DashboardAdmin'
import DashboardOperador from './components/DashboardOperador'
import DashboardCarpintero from './components/DashboardCarpintero'

function App() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Verificar si hay un token guardado
        const token = localStorage.getItem('token')
        if (token) {
            // Verificar el token con el backend
            fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setUser(data.user)
                    } else {
                        localStorage.removeItem('token')
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token')
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            setLoading(false)
        }
    }, [])

    const handleLogin = (userData, token) => {
        localStorage.setItem('token', token)
        setUser(userData)
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        setUser(null)
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div className="spinner"></div>
            </div>
        )
    }

    if (!user) {
        return <Login onLogin={handleLogin} />
    }

    // Renderizar dashboard según el rol
    switch (user.rol) {
        case 'admin':
            return <DashboardAdmin user={user} onLogout={handleLogout} />
        case 'operador':
            return <DashboardOperador user={user} onLogout={handleLogout} />
        case 'carpintero':
            return <DashboardCarpintero user={user} onLogout={handleLogout} />
        default:
            return <Login onLogin={handleLogin} />
    }
}

export default App
