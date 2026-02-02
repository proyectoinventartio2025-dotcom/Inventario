import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import '../index.css'

import UsersManager from './UsersManager'

export default function DashboardAdmin({ user, onLogout }) {
    const [activeSection, setActiveSection] = useState('dashboard')
    const isDemo = new URLSearchParams(window.location.search).get('demo') === '1'
    const token = localStorage.getItem('token')
    const [searchTerm, setSearchTerm] = useState('')

    // Estado para las órdenes
    const [recentOrders, setRecentOrders] = useState([])
    const [filteredStatus, setFilteredStatus] = useState(null) // Para filtrar por click en cards

    useEffect(() => {
        fetchOrders()
    }, [])
    useEffect(() => {
        const t = setTimeout(() => {
            fetchOrders()
        }, 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    const fetchOrders = async () => {
        if (isDemo) {
            const all = [
                { id: '#D-1201', qty: 2, type: 'Pallet', dims: '100x120x14', requester: 'packing', priority: 'normal', status: 'Creado' },
                { id: '#D-1202', qty: 1, type: 'Cajón', dims: '80x100x90', requester: 'logistica', priority: 'urgente', status: 'En Proceso' },
                { id: '#D-1203', qty: 3, type: 'Set Completo (Pallet + Cajón)', dims: '110x130x95', requester: 'export', priority: 'normal', status: 'Terminado' },
                { id: '#D-1204', qty: 4, type: 'Pallet', dims: '100x120x14', requester: 'packing', priority: 'normal', status: 'Entregado' }
            ]
            const filtered = searchTerm ? all.filter(o => String(o.id).toLowerCase().includes(String(searchTerm).toLowerCase())) : all
            setRecentOrders(filtered)
            return
        }
        try {
            const params = new URLSearchParams()
            if (searchTerm) params.set('q', searchTerm)
            const res = await fetch(`/api/orders?${params.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            const data = await res.json()
            if (data.success) {
                setRecentOrders(data.data || [])
            }
        } catch (error) {
            setRecentOrders([])
        }
    }

    const updateStatus = async (id, newStatus) => {
        if (isDemo) {
            setRecentOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
            return
        }
        try {
            const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                fetchOrders()
            }
        } catch (error) {
        }
    }

    const updatePriority = async (id, newPriority) => {
        if (isDemo) {
            setRecentOrders(prev => prev.map(o => o.id === id ? { ...o, priority: newPriority } : o))
            return
        }
        try {
            const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ priority: newPriority })
            })
            if (res.ok) {
                fetchOrders()
            }
        } catch (error) {
        }
    }

    const handleExport = async () => {
        try {
            const lines = [
                ['Delivery', 'Tipo', 'Cantidad', 'Medidas (cm)', 'Solicitante', 'Prioridad', 'Estado', 'Peso (kg)'].join(','),
                ...recentOrders.map(o => [
                    String(o.id || '').replace(/^#/, ''),
                    o.type || '',
                    o.qty ?? '',
                    o.dims || '',
                    o.requester || '',
                    o.priority || '',
                    o.status || '',
                    typeof o.pesoKg === 'number' ? o.pesoKg : (o.weight ? String(o.weight).replace(/[^\d.,-]/g, '') : '')
                ].map(v => {
                    const s = v == null ? '' : String(v)
                    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
                }).join(','))
            ]

            if (isDemo) {
                const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'ordenes-demo.csv'
                document.body.appendChild(a)
                a.click()
                a.remove()
                setTimeout(() => window.URL.revokeObjectURL(url), 1000)
                return
            }

            const res = await fetch(`${API_URL}/api/orders/export`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            if (!res.ok) return

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            const disposition = res.headers.get('Content-Disposition') || ''
            const match = disposition.match(/filename="([^"]+)"/i)
            a.href = url
            a.download = match?.[1] || 'ordenes.csv'
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        } catch (error) {
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Creado': return 'status-select status-creado';
            case 'En Proceso': return 'status-select status-en-proceso';
            case 'Terminado': return 'status-select status-terminado';
            case 'Entregado': return 'status-select status-terminado';
            default: return 'status-select status-normal';
        }
    }
    const getDeliveryClass = (status) => {
        switch (status) {
            case 'En Proceso': return 'cell-id delivery-status-en-proceso';
            case 'Terminado': return 'cell-id delivery-status-terminado';
            case 'Entregado': return 'cell-id delivery-status-terminado';
            default: return 'cell-id delivery-status-creado';
        }
    }
    const getPriorityBadge = (priority) => {
        return priority === 'urgente' ? 'status-select status-urgente' : 'status-select status-normal'
    }
    const getActionDotClass = (order) => {
        if (order.status === 'Terminado') return 'status-dot dot-green'
        return 'status-dot dot-red'
    }

    // Calcular Métricas Reales
    const metrics = {
        activas: recentOrders.filter(o => o.status !== 'Terminado' && o.status !== 'Cancelado').length,
        fabricacion: recentOrders.filter(o => o.status === 'En Proceso').length,
        urgencias: recentOrders.filter(o => o.priority === 'urgente' && o.status !== 'Terminado').length,
        terminados: recentOrders.filter(o => o.status === 'Terminado').length
    }

    const stats = [
        { title: 'Solicitudes Activas', value: metrics.activas, icon: '📋', color: 'blue', filter: 'active' },
        { title: 'En Fabricación', value: metrics.fabricacion, icon: '🔨', color: 'orange', filter: 'En Proceso' },
        { title: 'Urgencias', value: metrics.urgencias, icon: '🔥', color: 'red', filter: 'urgente' },
        { title: 'Terminados Hoy', value: metrics.terminados, icon: '✅', color: 'green', filter: 'Terminado' },
    ]

    const handleCardClick = (filter) => {
        setFilteredStatus(filter)
        setActiveSection('dashboard') // Asegurar que estamos en la vista de tabla
    }

    // Filtrar órdenes para la tabla
    const displayOrders = recentOrders.filter(order => {
        if (!filteredStatus) return true
        if (filteredStatus === 'active') return order.status !== 'Terminado'
        if (filteredStatus === 'urgente') return order.priority === 'urgente'
        return order.status === filteredStatus
    })

    const renderContent = () => {
        if (activeSection === 'usuarios') {
            return <UsersManager />
        }

        if (activeSection === 'solicitudes' || activeSection === 'dashboard') {
            return (
                <div className="dashboard-content">
                    <h1 className="page-title">
                        {activeSection === 'dashboard' ? 'Resumen de Planta' : 'Gestión de Solicitudes'}
                    </h1>

                    {/* Stats Grid - Solo visible en Dashboard */}
                    {activeSection === 'dashboard' && (
                        <div className="metrics-grid">
                            {stats.map((stat, index) => (
                                <div key={index} className="metric-card" onClick={() => handleCardClick(stat.filter)} style={{ cursor: 'pointer' }}>
                                    <div className="metric-header">
                                        <div className={`metric-icon-box color-${stat.color}`}>
                                            {stat.icon}
                                        </div>
                                    </div>
                                    <div className="metric-value">{stat.value}</div>
                                    <div className="metric-label">{stat.title}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Orders Table */}
                    <div className="card mt-4">
                        <div className="card-header">
                            <h3 className="card-title">
                                {filteredStatus ? `Solicitudes: ${filteredStatus}` : 'Últimas Solicitudes'}
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="badge">Total: {displayOrders.length}</span>
                                {filteredStatus && (
                                    <button className="btn btn-secondary text-sm" onClick={() => setFilteredStatus(null)}>
                                        Ver Todas
                                    </button>
                                )}
                                <button className="btn btn-primary" onClick={handleExport}>
                                    Exportar Excel
                                </button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Delivery #</th>
                                        <th>Cant.</th>
                                        <th>Tipo</th>
                                        <th>Medidas (cm)</th>
                                        <th>Solicitante</th>
                                        <th>Prioridad</th>
                                        <th>Estado</th>
                                        <th>Peso</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayOrders.map((order) => (
                                        <tr key={order.id} className={order.priority === 'urgente' ? 'row-urgent' : ''}>
                                            <td className={getDeliveryClass(order.status)}>
                                                {order.id}
                                                {order.priority === 'urgente' && <span style={{ marginLeft: '0.5rem' }}>🔥</span>}
                                            </td>
                                            <td style={{ fontWeight: 'bold' }}>x{order.qty}</td>
                                            <td>{order.type}</td>
                                            <td>{order.dims}</td>
                                            <td>{order.requester}</td>
                                            <td>
                                                <select
                                                    className={getPriorityBadge(order.priority)}
                                                    value={order.priority}
                                                    onChange={(e) => updatePriority(order.id, e.target.value)}
                                                >
                                                    <option value="normal">Normal</option>
                                                    <option value="urgente">Urgente</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select
                                                className={getStatusBadge(order.status)}
                                                value={order.status}
                                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                            >
                                                <option value="Creado">Creado</option>
                                                <option value="En Proceso">En Proceso</option>
                                                <option value="Terminado">Terminado</option>
                                            </select>
                                            </td>
                                            <td>{order.weight || (order.pesoKg != null ? `${order.pesoKg} kg` : '-')}</td>
                                            <td><span className={getActionDotClass(order)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )
        }
    }

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="logo-text">Control</span>
                </div>

                <nav className="sidebar-nav">
                    <a href="#" className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveSection('dashboard'); setFilteredStatus(null); }}>
                        <span className="nav-icon">📊</span> Dashboard
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'solicitudes' ? 'active' : ''}`} onClick={() => setActiveSection('solicitudes')}>
                        <span className="nav-icon">📋</span> Solicitudes
                    </a>
                    <a href="#" className={`nav-item ${activeSection === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveSection('usuarios')}>
                        <span className="nav-icon">👥</span> Usuarios
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">AD</div>
                        <div className="user-details">
                            <p className="user-name">{user.nombre}</p>
                            <p className="user-role">Administrador</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="logout-btn" title="Cerrar Sesión">
                        🚪
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-bar">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por Delivery..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                {renderContent()}
            </main>
        </div>
    )
}
