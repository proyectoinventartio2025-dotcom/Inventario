import { useState, useEffect } from 'react'
import '../index.css'

export default function UsersManager() {
    const [users, setUsers] = useState([])
    const [showModal, setShowModal] = useState(false)
    const token = localStorage.getItem('token')
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'operador'
    })
    const [error, setError] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            const data = await res.json()
            if (data.success) {
                setUsers(data.data)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            if (res.ok) {
                fetchUsers()
            }
        } catch (error) {
            console.error('Error deleting user:', error)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(formData)
            })
            const data = await res.json()

            if (data.success) {
                setShowModal(false)
                setFormData({ nombre: '', email: '', password: '', rol: 'operador' })
                fetchUsers()
            } else {
                setError(data.message || 'Error al crear usuario')
            }
        } catch (error) {
            setError('Error de conexión')
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="dashboard-content">
            <div className="content-header">
                <h1 className="page-title">Gestión de Usuarios</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Agregar Usuario
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td className="font-medium">{user.nombre}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className="badge badge-normal" style={{ textTransform: 'capitalize' }}>
                                            {user.rol}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.active ? 'badge-entregado' : 'badge-urgente'}`}>
                                            {user.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                                            onClick={() => handleDelete(user._id)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ padding: '2rem', width: '400px', maxWidth: '90%' }}>
                        <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Nuevo Usuario</h2>

                        {error && <div className="login-error">{error}</div>}

                        <form onSubmit={handleSubmit} className="input-group">
                            <input
                                className="input"
                                name="nombre"
                                placeholder="Nombre completo"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                            />
                            <input
                                className="input"
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <input
                                className="input"
                                name="password"
                                type="password"
                                placeholder="Contraseña"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <select
                                className="select"
                                name="rol"
                                value={formData.rol}
                                onChange={handleChange}
                            >
                                <option value="operador">Operador</option>
                                <option value="carpintero">Carpintero</option>
                                <option value="admin">Admin</option>
                            </select>

                            <div className="actions-row">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
