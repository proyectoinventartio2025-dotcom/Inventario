import { useState, useEffect } from 'react'
import '../index.css'

export default function DashboardOperador({ user, onLogout }) {
    const [view, setView] = useState('create')
    const [orders, setOrders] = useState([])
    const isDemo = new URLSearchParams(window.location.search).get('demo') === '1'
    const token = localStorage.getItem('token')
    const [successMessage, setSuccessMessage] = useState('')
    const [deliveryCheck, setDeliveryCheck] = useState({ exists: false, checking: false })
    const [searchTerm, setSearchTerm] = useState('')

    // Cargar órdenes desde el backend al iniciar
    useEffect(() => {
        fetchOrders()
    }, [])
    useEffect(() => {
        if (view !== 'list') return
        const t = setTimeout(() => {
            fetchOrders()
        }, 300)
        return () => clearTimeout(t)
    }, [searchTerm, view])

    const fetchOrders = async () => {
        if (isDemo) {
            const all = [
                { id: '#D-1202', qty: 1, type: 'Cajón', dims: '80x100x90', priority: 'urgente', status: 'En Proceso' },
                { id: '#D-1201', qty: 2, type: 'Pallet', dims: '100x120x14', priority: 'normal', status: 'Creado' }
            ]
            const filtered = searchTerm ? all.filter(o => String(o.id).toLowerCase().includes(String(searchTerm).toLowerCase())) : all
            setOrders(filtered)
            return
        }
        try {
            const params = new URLSearchParams()
            if (searchTerm) params.set('q', searchTerm)
            const res = await fetch(`${API_URL}/api/orders?${params.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            const data = await res.json()
            if (data.success) {
                setOrders(data.data)
            }
        } catch (error) {
        }
    }

    const initialForm = {
        delivery: '',
        qty: 1,
        type: '',
        dimsL: '',
        attrsW: '',
        dimsH: '',
        priority: 'normal',
        pesoKg: '',
        itemProducto: '',
        comentarios: ''
    }
    const [formData, setFormData] = useState(initialForm)
    const [extraCajones, setExtraCajones] = useState([])
    const [extraPallets, setExtraPallets] = useState([])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    useEffect(() => {
        const run = async () => {
            if (!formData.delivery) {
                setDeliveryCheck({ exists: false, checking: false })
                return
            }
            if (isDemo) return
            try {
                setDeliveryCheck({ exists: false, checking: true })
                const res = await fetch(`${API_URL}/api/orders/check/${encodeURIComponent(formData.delivery)}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                })
                const data = await res.json()
                if (data.success) {
                    setDeliveryCheck({ exists: !!data.exists, checking: false })
                } else {
                    setDeliveryCheck({ exists: false, checking: false })
                }
            } catch {
                setDeliveryCheck({ exists: false, checking: false })
            }
        }
        const t = setTimeout(run, 300)
        return () => clearTimeout(t)
    }, [formData.delivery])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (deliveryCheck.exists && !isDemo) {
            return
        }

        const tipoPedido = formData.type === 'mixed' ? 'estructura' : formData.type
        const parsedExtras = extraCajones.map(c => ({
            medidas: {
                largo: Number(c.dimsL),
                ancho: Number(c.attrsW),
                alto: Number(c.dimsH)
            },
            pesoKg: c.pesoKg === '' || c.pesoKg == null ? undefined : Number(c.pesoKg),
            qty: 1
        })).filter(c => c.medidas.largo > 0 && c.medidas.ancho > 0 && c.medidas.alto > 0)
        const parsedPallets = extraPallets.map(p => ({
            medidas: {
                largo: Number(p.dimsL),
                ancho: Number(p.attrsW),
                alto: Number(p.dimsH)
            },
            pesoKg: p.pesoKg === '' || p.pesoKg == null ? undefined : Number(p.pesoKg),
            qty: 1
        })).filter(p => p.medidas.largo > 0 && p.medidas.ancho > 0 && p.medidas.alto > 0)
        const totalQty = Number(formData.qty || 0) + parsedExtras.length + parsedPallets.length
        const newOrderPayload = {
            delivery: formData.delivery,
            qty: totalQty,
            tipoPedido,
            medidas: {
                largo: Number(formData.dimsL),
                ancho: Number(formData.attrsW),
                alto: Number(formData.dimsH)
            },
            cajones: parsedExtras,
            pallets: parsedPallets,
            pesoKg: Number(formData.pesoKg),
            prioridad: formData.priority || 'normal',
            itemProducto: formData.itemProducto || '',
            comentarios: formData.comentarios || ''
        }

        if (isDemo) {
            const baseDims = `${formData.dimsL}x${formData.attrsW}x${formData.dimsH}`
            const extras = parsedExtras.map(c => {
                const d = `${c.medidas.largo}x${c.medidas.ancho}x${c.medidas.alto}`
                const w = typeof c.pesoKg === 'number' && Number.isFinite(c.pesoKg) ? ` (${c.pesoKg}kg)` : ''
                return `${d}${w}`
            })
            const extrasPal = parsedPallets.map(p => {
                const d = `${p.medidas.largo}x${p.medidas.ancho}x${p.medidas.alto}`
                const w = typeof p.pesoKg === 'number' && Number.isFinite(p.pesoKg) ? ` (${p.pesoKg}kg)` : ''
                return `${d}${w}`
            })
            let dimsStr = baseDims
            if (tipoPedido === 'estructura') {
                const palletParts = [baseDims, ...extrasPal].filter(Boolean)
                const palletLabel = palletParts.length ? `Pallet: ${palletParts.join(' • ')}` : ''
                const cajonLabel = extras.length ? `Cajón(es): ${extras.join(' • ')}` : ''
                dimsStr = [palletLabel, cajonLabel].filter(Boolean).join(' | ')
            } else if (tipoPedido === 'cajon' && extras.length) {
                dimsStr = [baseDims, ...extras].filter(Boolean).join(' • ')
            } else if (tipoPedido === 'pallet' && extrasPal.length) {
                dimsStr = [baseDims, ...extrasPal].filter(Boolean).join(' • ')
            }
            const demoOrder = {
                id: '#' + formData.delivery,
                qty: totalQty,
                type: formData.type === 'mixed' ? 'Set Completo (Pallet + Cajón)' : (formData.type === 'cajon' ? 'Cajón' : 'Pallet'),
                dims: dimsStr,
                requester: user.nombre || 'Operador',
                priority: formData.priority || 'normal',
                status: 'Creado'
            }
            setOrders(prev => [{ ...demoOrder }, ...prev])
            setSuccessMessage('Solicitud enviada a Carpintería')
            return
        }
        try {
            const res = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(newOrderPayload)
            })

            if (res.ok) {
                setSuccessMessage('Solicitud enviada a Carpintería')
                setFormData(initialForm)
                await fetchOrders()
                setTimeout(() => setSuccessMessage(''), 4000)
            }
        } catch (error) {
        }
    }

    const updatePriority = async (id, value) => {
        const encodedId = encodeURIComponent(id)
        if (isDemo) {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, priority: value } : o))
            return
        }
        try {
            const res = await fetch(`/api/orders/${encodedId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ priority: value })
            })
            if (res.ok) {
                await fetchOrders()
            }
        } catch (error) {
        }
    }

    const deleteOrder = async (id) => {
        const encodedId = encodeURIComponent(id)
        if (isDemo) {
            setOrders(prev => prev.filter(o => o.id !== id))
            return
        }
        try {
            const res = await fetch(`${API_URL}/api/orders/${encodedId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            })
            if (res.ok) {
                await fetchOrders()
            }
        } catch (error) {
        }
    }

    const getDeliveryClass = (status) => {
        switch (status) {
            case 'En Proceso': return 'cell-id delivery-status-en-proceso';
            case 'Terminado': return 'cell-id delivery-status-terminado';
            case 'Entregado': return 'cell-id delivery-status-entregado';
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
        return status
    }
    const getPriorityBadge = (priority) => {
        return priority === 'urgente' ? 'status-select status-urgente' : 'status-select status-normal'
    }

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo-icon">👷</div>
                    <span className="logo-text">Packing</span>
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className={`nav-item ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>
                        <span className="nav-icon">➕</span> Solicitar
                    </a>
                    <a href="#" className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
                        <span className="nav-icon">📋</span> Mis Solicitudes
                    </a>
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">OP</div>
                        <div className="user-details">
                            <p className="user-name">{user.nombre}</p>
                            <p className="user-role">Operador Packing</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="logout-btn">🚪</button>
                </div>
            </aside>

            <main className="main-content">
                <div className="top-bar">
                    <h1 className="page-title">
                        {view === 'create' ? 'Nueva Solicitud' : 'Historial de Solicitudes'}
                    </h1>
                </div>

                {view === 'list' ? (
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title">Mis Solicitudes</h3>
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
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Delivery #</th>
                                        <th>Cant.</th>
                                        <th>Tipo</th>
                                        <th>Medidas (cm)</th>
                                        <th>Prioridad</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, index) => (
                                        <tr key={index}>
                                            <td className={getDeliveryClass(order.status)}>
                                                {order.id}
                                                {order.priority === 'urgente' && <span style={{ marginLeft: '0.5rem' }}>🔥</span>}
                                            </td>
                                            <td style={{ fontWeight: 'bold' }}>x{order.qty}</td>
                                            <td>{order.type}</td>
                                            <td>{order.dims}</td>
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
                                                <span className={getStatusBadge(order.status)}>{getStatusLabel(order.status)}</span>
                                                <span className={order.status === 'Terminado' ? 'status-dot dot-green' : 'status-dot dot-red'} style={{ marginLeft: '0.5rem' }} />
                                                {order.status === 'Terminado' && order.finishedAt && (
                                                    <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                                        Terminado el {new Date(order.finishedAt).toLocaleString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => deleteOrder(order.id)}
                                                    title="Eliminar solicitud"
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
                ) : (
                    <div className="card order-card">
                        <div className="card-header">
                            <h3 className="card-title">Detalles del Requerimiento</h3>
                        </div>
                        <form className="order-form" onSubmit={handleSubmit}>

                            {/* Tipo y Delivery */}
                            <div className="form-grid grid-2-1">
                                <div className="input-group">
                                    <label className="input-label required">Delivery / Packing #</label>
                                    <input
                                        type="text"
                                        name="delivery"
                                        className="input"
                                        placeholder="Ej: 44321"
                                        required
                                        value={formData.delivery}
                                        onChange={handleInputChange}
                                    />
                                    {deliveryCheck.exists && (
                                        <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                            Ya existe una solicitud con este Delivery
                                        </div>
                                    )}
                                </div>
                                <div className="input-group">
                                    <label className="input-label required">Cantidad</label>
                                    <input
                                        type="number"
                                        name="qty"
                                        className="input"
                                        placeholder="Ej: 2"
                                        min="1"
                                        required
                                        value={formData.qty}
                                        onChange={handleInputChange}
                                    />
                                    {(extraCajones.length > 0 || extraPallets.length > 0) && (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                            Total piezas: {Number(formData.qty || 0) + extraCajones.length + extraPallets.length}
                                        </div>
                                    )}
                                </div>
                        </div>

                            <div className="form-grid">
                                <div className="input-group">
                                    <label className="input-label required">Tipo de Estructura</label>
                                    <select
                                        className="input select" // Added select class
                                        required
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="pallet">Pallet</option>
                                        <option value="cajon">Cajón</option>
                                        <option value="mixed">Set Completo (Pallet + Cajón)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Medidas */}
                            <div className="form-grid"> {/* Wrapper for label block */}
                                <label className="input-label required">Medidas (Centímetros)</label>
                                <div className="form-grid grid-3" style={{ margin: 0 }}> {/* Nested grid */}
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            name="dimsL"
                                            className="input"
                                            placeholder="Largo"
                                            min="1"
                                            required
                                            value={formData.dimsL}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            name="attrsW"
                                            className="input"
                                            placeholder="Ancho"
                                            min="1"
                                            required
                                            value={formData.attrsW}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            name="dimsH"
                                            className="input"
                                            placeholder="Alto"
                                            min="1"
                                            required
                                            value={formData.dimsH}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {(formData.type === 'cajon' || formData.type === 'mixed') && (
                                <div className="form-grid">
                                    <label className="input-label">Cajones adicionales (opcional)</label>
                                    {extraCajones.map((c, idx) => (
                                        <div key={idx} className="form-grid" style={{ margin: 0 }}>
                                            <div className="form-grid grid-3" style={{ margin: 0 }}>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="Largo"
                                                        min="1"
                                                        value={c.dimsL || ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value
                                                            setExtraCajones(prev => prev.map((item, i) => i === idx ? { ...item, dimsL: v } : item))
                                                        }}
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="Ancho"
                                                        min="1"
                                                        value={c.attrsW || ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value
                                                            setExtraCajones(prev => prev.map((item, i) => i === idx ? { ...item, attrsW: v } : item))
                                                        }}
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="Alto"
                                                        min="1"
                                                        value={c.dimsH || ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value
                                                            setExtraCajones(prev => prev.map((item, i) => i === idx ? { ...item, dimsH: v } : item))
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-grid grid-2" style={{ marginTop: '0.5rem' }}>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="Peso (kg)"
                                                        min="0"
                                                        step="0.1"
                                                        value={c.pesoKg ?? ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value
                                                            setExtraCajones(prev => prev.map((item, i) => i === idx ? { ...item, pesoKg: v } : item))
                                                        }}
                                                    />
                                                </div>
                                                <div className="input-group" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => setExtraCajones(prev => prev.filter((_, i) => i !== idx))}
                                                    >
                                                        Eliminar cajón
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setExtraCajones(prev => [...prev, { dimsL: '', attrsW: '', dimsH: '', pesoKg: '' }])}
                                        >
                                            Agregar cajón
                                        </button>
                                    </div>
                            </div>
            )}

            {(formData.type === 'pallet' || formData.type === 'mixed') && (
                <div className="form-grid">
                    <label className="input-label">Pallets adicionales (opcional)</label>
                    {extraPallets.map((p, idx) => (
                        <div key={idx} className="form-grid" style={{ margin: 0 }}>
                            <div className="form-grid grid-3" style={{ margin: 0 }}>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="Largo"
                                        min="1"
                                        value={p.dimsL || ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setExtraPallets(prev => prev.map((item, i) => i === idx ? { ...item, dimsL: v } : item))
                                        }}
                                    />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="Ancho"
                                        min="1"
                                        value={p.attrsW || ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setExtraPallets(prev => prev.map((item, i) => i === idx ? { ...item, attrsW: v } : item))
                                        }}
                                    />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="Alto"
                                        min="1"
                                        value={p.dimsH || ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setExtraPallets(prev => prev.map((item, i) => i === idx ? { ...item, dimsH: v } : item))
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="form-grid grid-2" style={{ marginTop: '0.5rem' }}>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="Peso (kg)"
                                        min="0"
                                        step="0.1"
                                        value={p.pesoKg ?? ''}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setExtraPallets(prev => prev.map((item, i) => i === idx ? { ...item, pesoKg: v } : item))
                                        }}
                                    />
                                </div>
                                <div className="input-group" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setExtraPallets(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                        Eliminar pallet
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setExtraPallets(prev => [...prev, { dimsL: '', attrsW: '', dimsH: '', pesoKg: '' }])}
                        >
                            Agregar pallet
                        </button>
                    </div>
                </div>
            )}

            {/* Item y Peso */}
            <div className="form-grid grid-2">
                <div className="input-group">
                    <label className="input-label">Ítem (Opcional)</label>
                    <input
                                        type="text"
                                        name="itemProducto"
                                        className="input"
                                        placeholder="Código producto"
                                        value={formData.itemProducto}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label required">Peso Estimado (kg)</label>
                                    <input
                                        type="number"
                                        name="pesoKg"
                                        className="input"
                                        placeholder="Ej: 500"
                                        min="1"
                                        required
                                        value={formData.pesoKg}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Prioridad y Comentarios */}
                            <div className="form-grid">
                                <div className="input-group">
                                    <label className="input-label required">Prioridad</label>
                                    <select className="input select" name="priority" value={formData.priority || 'normal'} onChange={handleInputChange} required>
                                        <option value="normal">Normal</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="input-group">
                                    <label className="input-label">Comentarios / Instrucciones</label>
                                    <textarea
                                        name="comentarios"
                                        className="input textarea"
                                        rows="3"
                                        placeholder="Refuerzos extra, madera certificada, etc..."
                                        value={formData.comentarios}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {successMessage && (
                                <div className="alert-success" role="status" aria-live="polite">
                                    {successMessage}
                                </div>
                            )}
                            <div style={{ marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary btn-submit" disabled={deliveryCheck.exists && !isDemo}>
                                    Enviar Solicitud a Carpinteria 📤
                                </button>
                            </div>
                            </form>
                    </div>
                )}
            </main>
        </div>
    )
}
