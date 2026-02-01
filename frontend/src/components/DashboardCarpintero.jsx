import { useState, useEffect } from 'react'
import '../index.css'

const getDeliveryClass = (status) => {
    switch (status) {
        case 'En Proceso': return 'cell-id delivery-status-en-proceso';
        case 'Terminado': return 'cell-id delivery-status-terminado';
        case 'Entregado': return 'cell-id delivery-status-terminado';
        default: return 'cell-id delivery-status-creado';
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
const getStatusLabel = (status) => {
    if (status === 'Creado') return 'No Iniciado'
    if (status === 'En Proceso') return 'En Fabricación'
    if (status === 'Entregado') return 'Terminado'
    return status
}
const getReadyDot = (status) => {
    return status === 'Terminado' ? 'status-dot dot-green' : 'status-dot dot-red'
}
const getPriorityBadge = (priority) => {
    return priority === 'urgente' ? 'status-select status-urgente' : 'status-select status-normal'
}
const getPriorityLabel = (priority) => {
    return priority === 'urgente' ? 'Urgente' : 'Normal'
}

export default function DashboardCarpintero({ user, onLogout }) {
    // Tareas reales de taller (Industrial)
    const [tasks, setTasks] = useState([])
    const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 25 })
    const [viewMode, setViewMode] = useState('table')
    const [statusFilter, setStatusFilter] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(25)
    const isDemo = new URLSearchParams(window.location.search).get('demo') === '1'
    const token = localStorage.getItem('token')

    useEffect(() => {
        fetchTasks()
        if (isDemo) return
        const interval = setInterval(fetchTasks, 5000)
        return () => clearInterval(interval)
    }, [statusFilter, priorityFilter, searchTerm, page, limit])

    const fetchTasks = async () => {
        if (isDemo) {
            const all = [
                { id: '#D-1202', type: 'Cajón', qty: 1, dims: '80x100x90', requester: 'Op. Demo', priority: 'urgente', status: 'En Proceso', weight: '120 kg' },
                { id: '#D-1201', type: 'Pallet', qty: 2, dims: '100x120x14', requester: 'Op. Demo', priority: 'normal', status: 'Creado', weight: '200 kg' },
                { id: '#D-1203', type: 'Pallet', qty: 5, dims: '110x130x15', requester: 'Op. Demo', priority: 'urgente', status: 'Creado', weight: '500 kg' },
                { id: '#D-1204', type: 'Cajón', qty: 3, dims: '60x80x70', requester: 'Op. Demo', priority: 'normal', status: 'Terminado', weight: '150 kg' }
            ]
            const filtered = all.filter(o => {
                const s = statusFilter ? o.status === statusFilter : true
                const p = priorityFilter ? o.priority === priorityFilter : true
                const q = searchTerm ? String(o.id).toLowerCase().includes(String(searchTerm).toLowerCase()) : true
                return s && p && q
            })
            const start = (page - 1) * limit
            const slice = filtered.slice(start, start + limit)
            setTasks(slice)
            setMeta({ total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)), page, limit })
            return
        }
        try {
            const params = new URLSearchParams()
            if (statusFilter) params.set('status', statusFilter)
            if (priorityFilter) params.set('priority', priorityFilter)
            if (searchTerm) params.set('q', searchTerm)
            params.set('page', String(page))
            params.set('limit', String(limit))
            const res = await fetch(`/api/orders?${params.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            const data = await res.json()
            if (data.success) {
                setTasks(data.data || [])
                setMeta(data.meta || { total: 0, totalPages: 1, page: 1, limit })
            }
        } catch (error) {
            console.error('Error fetching tasks:', error)
        }
    }

    const updateTaskStatus = async (id, newStatus) => {
        if (isDemo) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
            return
        }
        try {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(id))
            const url = isObjectId ? `/api/orders/record/${id}` : `/api/orders/${encodeURIComponent(id)}`
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                fetchTasks() // Recargar datos
            }
        } catch (error) {
            console.error('Error updating task:', error)
        }
    }

    const startTask = (task) => updateTaskStatus(task.recordId || task.id, 'En Proceso')
    const finishTask = (task) => updateTaskStatus(task.recordId || task.id, 'Terminado')

    // Separar tareas por prioridad y estado
    const urgentTasks = tasks.filter(t => t.priority === 'urgente' && t.status !== 'Terminado')
    const normalTasks = tasks.filter(t => t.priority !== 'urgente' && t.status !== 'Terminado')
    const finishedTasks = tasks.filter(t => t.status === 'Terminado')

    return (
        <div className="app-container">
            {/* Sidebar Taller */}
            <aside className="sidebar" style={{ width: '80px', alignItems: 'center' }}>
                <div className="sidebar-header" style={{ justifyContent: 'center', padding: '1rem 0' }}>
                    <div className="logo-icon" style={{ width: '3rem', height: '3rem', fontSize: '1.5rem' }}>🔨</div>
                </div>

                <nav className="sidebar-nav" style={{ alignItems: 'center' }}>
                    <a href="#" className="nav-item active" style={{ justifyContent: 'center', width: '3rem', height: '3rem', padding: 0 }}>
                        <span className="nav-icon" style={{ marginRight: 0, fontSize: '1.5rem' }}>📋</span>
                    </a>
                </nav>

                <div className="sidebar-footer" style={{ flexDirection: 'column', gap: '1rem' }}>
                    <div className="user-avatar" title={user.nombre}>C</div>
                    <button onClick={onLogout} className="logout-btn">🚪</button>
                </div>
            </aside>

            <main className="main-content" style={{ marginLeft: '80px', width: 'calc(100% - 80px)' }}>
                <div className="top-bar">
                    <div>
                        <h1 className="page-title">Cola de Fabricación</h1>
                        <p className="text-sm">
                            Selecciona cualquier pedido urgente para comenzar.
                        </p>
                    </div>
                    <div className="top-actions" style={{ gap: '0.5rem' }}>
                        <select className="btn btn-secondary" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}>
                            <option value="">Estado: Todos</option>
                            <option value="Creado">No Iniciado</option>
                            <option value="En Proceso">En Fabricación</option>
                            <option value="Terminado">Terminado</option>
                        </select>
                        <select className="btn btn-secondary" value={priorityFilter} onChange={(e) => { setPage(1); setPriorityFilter(e.target.value) }}>
                            <option value="">Prioridad: Todas</option>
                            <option value="urgente">Urgente</option>
                            <option value="normal">Normal</option>
                        </select>
                        <input
                            className="search-input"
                            style={{ width: '220px', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.4rem 0.6rem' }}
                            placeholder="Buscar por Delivery..."
                            value={searchTerm}
                            onChange={(e) => { setPage(1); setSearchTerm(e.target.value) }}
                        />
                        <select className="btn btn-secondary" value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                            <option value="table">Tabla</option>
                            <option value="cards">Cards</option>
                        </select>
                    </div>
                </div>

                {viewMode === 'table' ? (
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title">Pedidos</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="badge">Total: {meta.total}</span>
                                <select className="btn btn-secondary" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)) }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Delivery #</th>
                                        <th>Cant.</th>
                                        <th>Tipo</th>
                                        <th>Medidas</th>
                                        <th>Prioridad</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task) => (
                                        <tr key={task.recordId || task.id} className={task.priority === 'urgente' ? 'row-urgent' : ''}>
                                            <td className={getDeliveryClass(task.status)}>
                                                <span className={getReadyDot(task.status)} />
                                                {task.id}
                                                {task.priority === 'urgente' && <span style={{ marginLeft: '0.5rem' }}>🔥</span>}
                                            </td>
                                            <td style={{ fontWeight: 'bold' }}>x{task.qty}</td>
                                            <td>{task.type}</td>
                                            <td>{task.dims}</td>
                                            <td><span className={getPriorityBadge(task.priority)}>{getPriorityLabel(task.priority)}</span></td>
                                            <td><span className={getStatusBadge(task.status)}>{getStatusLabel(task.status)}</span></td>
                                            <td>
                                                {task.status !== 'En Proceso' && task.status !== 'Terminado' && (
                                                    <button className="btn btn-primary" onClick={() => startTask(task)}>Fabricar</button>
                                                )}
                                                {task.status === 'En Proceso' && (
                                                    <button className="btn btn-primary" onClick={() => finishTask(task)}>Terminar</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
                            <span>Página {meta.page} de {meta.totalPages}</span>
                            <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}>Siguiente</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {urgentTasks.length > 0 && (
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{ color: 'var(--error)', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    🔥 URGENCIAS ({urgentTasks.length})
                                </h2>
                                <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    {urgentTasks.map(task => (
                                        <JobCard key={task.recordId || task.id} task={task} startTask={startTask} finishTask={finishTask} updateTaskStatus={updateTaskStatus} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {normalTasks.length > 0 && (
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📋 COLA ESTÁNDAR ({normalTasks.length})
                                </h2>
                                <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    {normalTasks.map(task => (
                                        <JobCard key={task.recordId || task.id} task={task} startTask={startTask} finishTask={finishTask} updateTaskStatus={updateTaskStatus} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {finishedTasks.length > 0 && (
                            <div style={{ opacity: 0.6 }}>
                                <h2 style={{ color: 'var(--success)', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    ✅ TERMINADOS HOY ({finishedTasks.length})
                                </h2>
                                <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    {finishedTasks.map(task => (
                                        <JobCard key={task.recordId || task.id} task={task} startTask={startTask} finishTask={finishTask} updateTaskStatus={updateTaskStatus} readOnly={true} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

            </main>
        </div>
    )
}

// Componente Tarjeta Extraído para Reutilizar
function JobCard({ task, startTask, finishTask, updateTaskStatus, readOnly = false }) {
    const isPack = task.type.includes('PACK')

    const getPriorityColor = (p) => {
        if (task.status === 'Terminado') return 'var(--success)';
        if (p === 'urgente') return 'var(--error)';
        if (p === 'no-urgente') return 'var(--success)';
        return 'var(--primary-500)';
    }

    const getPriorityLabel = (p) => {
        if (task.status === 'Terminado') return 'TERMINADO ✅';
        if (p === 'urgente') return 'Urgente';
        if (isPack) return 'Pack Completo';
        if (p === 'no-urgente') return 'Baja';
        return 'Normal';
    }
    const getPriorityBadge = (p) => {
        return p === 'urgente' ? 'status-select status-urgente' : 'status-select status-normal'
    }
    const getDeliveryClass = (status) => {
        switch (status) {
            case 'En Proceso': return 'cell-id delivery-status-en-proceso';
            case 'Terminado': return 'cell-id delivery-status-terminado';
            case 'Entregado': return 'cell-id delivery-status-terminado';
            default: return 'cell-id delivery-status-creado';
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
    const getStatusLabel = (status) => {
        if (status === 'Creado') return 'No Iniciado'
        if (status === 'En Proceso') return 'En Fabricación'
        if (status === 'Entregado') return 'Terminado'
        return status
    }
    const getReadyDot = (status) => {
        return status === 'Terminado' ? 'status-dot dot-green' : 'status-dot dot-red'
    }

    return (
        <div
            className={
                `job-card ${
                    task.status === 'Terminado'
                        ? 'job-card--finished'
                        : task.priority === 'urgente'
                            ? 'job-card--urgent'
                            : 'job-card--normal'
                }`
            }
        >
            <div className="job-card-body">
                <div className="job-card-top">
                    <span className={`${getDeliveryClass(task.status)} job-card-id`}>
                        <span className={getReadyDot(task.status)} />
                        {task.id}
                        {task.priority === 'urgente' && <span className="job-card-fire">🔥</span>}
                    </span>
                    <span className={getPriorityBadge(task.priority)}>{getPriorityLabel(task.priority)}</span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <span className={`units-badge ${task.status === 'Terminado' ? 'units-success' : ''}`}>
                        x{task.qty} UNIDADES
                    </span>
                </div>

                <h2 className="job-type">{task.type}</h2>
                <h3 className="job-dims">
                    {task.dims}
                </h3>

                <div className="job-info">
                    <div style={{ flex: 1 }}>
                        <p className="job-info-label">CARGA</p>
                        <p className="job-info-value">{task.weight}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <p className="job-info-label">Solicitante</p>
                        <p className="job-info-value">{task.requester}</p>
                    </div>
                </div>

                {task.desc && (
                    <div className="job-desc">
                        ℹ️ {task.desc}
                    </div>
                )}

                <div className="job-status-row">
                    <span className={getStatusBadge(task.status)}>Estado: {getStatusLabel(task.status)}</span>
                </div>

                {!readOnly && (
                    <div className="card-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {task.status !== 'En Proceso' && (
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '0.75rem', gridColumn: 'span 2' }}
                                onClick={() => startTask(task)}
                            >
                                🔨 Fabricar
                            </button>
                        )}

                        {task.status === 'En Proceso' && (
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '0.75rem', gridColumn: 'span 2' }}
                                onClick={() => finishTask(task)}
                            >
                                ✅ Terminar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
