import { useState, useEffect } from 'react';
import localforage from 'localforage';

// 👇 PON AQUÍ TU ENLACE REAL DE RENDER (Sin barra diagonal / al final)
const URL_BACKEND = 'https://autolog-catalogo.onrender.com';

function Admin() {
  const [tabActiva, setTabActiva] = useState('VEHICULOS'); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mensaje, setMensaje] = useState('');
  
  const [inventario, setInventario] = useState([]);
  const [categoriasLista, setCategoriasLista] = useState([]);
  const [marcasLista, setMarcasLista] = useState([]);
  const [vehiculosLista, setVehiculosLista] = useState([]);
  const [ventasList, setVentasList] = useState([]);
  const [ventasPendientesOffline, setVentasPendientesOffline] = useState(0);

  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: '', categoria_id: '', vehiculos_compatibles: [], imagen_url_actual: '' });
  const [repuestoEditando, setRepuestoEditando] = useState(false);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ marca_auto: '', modelo: '' });

  const [posCarrito, setPosCarrito] = useState([]);
  const [posBusqueda, setPosBusqueda] = useState('');
  const [posMetodoPago, setPosMetodoPago] = useState('Efectivo USD');
  const [comprobanteArchivo, setComprobanteArchivo] = useState(null);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); cargarTodo(); sincronizarVentasOffline(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); 
    window.addEventListener('offline', handleOffline);
    cargarTodo(); 
    contarVentasOffline();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const contarVentasOffline = async () => { const p = await localforage.getItem('ventas_pendientes') || []; setVentasPendientesOffline(p.length); };

  const cargarTodo = async () => {
    try { const res = await fetch(`${URL_BACKEND}/api/productos`); const data = await res.json(); setInventario(data); await localforage.setItem('cache_productos', data); } catch(e) { const cache = await localforage.getItem('cache_productos'); if(cache) setInventario(cache); }
    try { const res = await fetch(`${URL_BACKEND}/api/categorias`); const data = await res.json(); setCategoriasLista(data); if(!repuestoEditando && data.length > 0) setFormulario(prev => ({ ...prev, categoria_id: data[0].id })); } catch(e) {}
    try { const res = await fetch(`${URL_BACKEND}/api/marcas`); const data = await res.json(); setMarcasLista(data); if(!repuestoEditando && data.length > 0) setFormulario(prev => ({ ...prev, marca_id: data[0].id })); } catch(e) {}
    try { const res = await fetch(`${URL_BACKEND}/api/vehiculos`); const data = await res.json(); setVehiculosLista(data); } catch(e) {}
    try { const res = await fetch(`${URL_BACKEND}/api/ventas`); const data = await res.json(); if(Array.isArray(data)) setVentasList(data); } catch(e) {}
  };

  const mostrarAlerta = (texto) => { setMensaje(texto); setTimeout(() => setMensaje(''), 5000); };

  const sincronizarVentasOffline = async () => {
    const pendientes = await localforage.getItem('ventas_pendientes') || [];
    if (pendientes.length === 0) return;
    mostrarAlerta(`🔄 Subiendo ${pendientes.length} ventas locales...`);
    let exitosas = [];
    for (let v of pendientes) {
      try {
        const res = await fetch(`${URL_BACKEND}/api/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metodo_pago: v.metodo_pago, total: v.total, detalles: JSON.stringify(v.detalles) }) });
        if (res.ok) exitosas.push(v.idOffline);
      } catch (err) {}
    }
    await localforage.setItem('ventas_pendientes', pendientes.filter(v => !exitosas.includes(v.idOffline)));
    contarVentasOffline(); cargarTodo();
  };

  const guardarVehiculo = async () => {
    if (!isOnline) return alert("⚠️ Necesitas conexión a internet.");
    if (!nuevoVehiculo.marca_auto.trim() || !nuevoVehiculo.modelo.trim()) return alert('⚠️ Llena la marca y el modelo.');
    
    try {
        setMensaje('⏳ Conectando con el Servidor...');
        const res = await fetch(`${URL_BACKEND}/api/vehiculos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoVehiculo)
        });
        
        const respuestaTexto = await res.text();
        setMensaje('');
        
        if(res.ok) {
            alert('✅ Vehículo registrado exitosamente');
            setNuevoVehiculo({ marca_auto: '', modelo: '' });
            cargarTodo();
        } else {
            try {
                const err = JSON.parse(respuestaTexto);
                alert(`❌ Error Base de Datos: ${err.error}`);
            } catch {
                alert(`❌ ERROR HTML DEL SERVIDOR:\n\n${respuestaTexto.substring(0, 150)}...`);
            }
        }
    } catch (e) {
        setMensaje('');
        alert(`❌ Falla de Red o Servidor Caído: ${e.message}`);
    }
  };

  const accionSimple = async (ruta, metodo, cuerpo) => { 
    if(!isOnline) { alert("⚠️ Necesitas internet."); return; }
    try {
        const opciones = { method: metodo }; 
        if (cuerpo) { opciones.headers = { 'Content-Type': 'application/json' }; opciones.body = JSON.stringify(cuerpo); }
        setMensaje('⏳ Procesando...');
        const res = await fetch(`${URL_BACKEND}/api/${ruta}`, opciones); const respuesta = await res.text(); setMensaje(''); 
        if(!res.ok) { try { const err = JSON.parse(respuesta); alert(`❌ Error: ${err.error}`); } catch { alert(`❌ Error Servidor.`); } return; }
        alert('✅ ¡Operación exitosa!'); setNuevaMarca(''); setNuevaCategoria(''); cargarTodo(); 
    } catch(e) { setMensaje(''); alert(`❌ Falla red.`); }
  };

  const posAgregar = (producto) => {
    if (producto.stock <= 0) return;
    setPosCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) { if (existe.cantidad >= producto.stock) { alert('Stock insuficiente'); return prev; } return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i); }
      return [...prev, { ...producto, cantidad: 1 }];
    }); setPosBusqueda('');
  };

  const posEliminar = (id) => setPosCarrito(prev => prev.filter(i => i.id !== id));
  const posTotal = posCarrito.reduce((t, i) => t + (parseFloat(i.precio || 0) * i.cantidad), 0).toFixed(2);

  const procesarVenta = async () => {
    if(posCarrito.length === 0) return;
    const datosVenta = { metodo_pago: posMetodoPago, total: posTotal, detalles: posCarrito.map(p => ({ id: p.id, cantidad: p.cantidad, precio: p.precio })) };

    if (isOnline) {
        const formData = new FormData();
        formData.append('metodo_pago', datosVenta.metodo_pago); formData.append('total', datosVenta.total); formData.append('detalles', JSON.stringify(datosVenta.detalles));
        if (comprobanteArchivo) formData.append('comprobante', comprobanteArchivo);
        try {
            setMensaje('⏳ Procesando pago...');
            const res = await fetch(`${URL_BACKEND}/api/ventas`, { method: 'POST', body: formData });
            const respuestaTexto = await res.text(); setMensaje('');
            if(res.ok) { 
                alert('✅ ¡Venta registrada!'); setPosCarrito([]); setComprobanteArchivo(null); 
                const fileInput = document.getElementById('inputComp'); if(fileInput) fileInput.value = '';
                cargarTodo(); 
            } else { alert(`❌ Error: ${respuestaTexto}`); }
        } catch (e) { setMensaje(''); alert(`❌ Falla de red.`); }
    } else {
        const vOffline = { ...datosVenta, idOffline: Date.now() }; const p = await localforage.getItem('ventas_pendientes') || [];
        await localforage.setItem('ventas_pendientes', [...p, vOffline]);
        setPosCarrito([]); alert('⚠️ Venta guardada LOCALMENTE por falta de internet.'); contarVentasOffline();
    }
  };

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });
  
  const toggleVehiculo = (vehiculoId) => {
    setFormulario(prev => {
        const compatibles = prev.vehiculos_compatibles || [];
        if (compatibles.includes(vehiculoId)) return { ...prev, vehiculos_compatibles: compatibles.filter(id => id !== vehiculoId) };
        else return { ...prev, vehiculos_compatibles: [...compatibles, vehiculoId] };
    });
  };

  const guardarRepuesto = async (e) => {
    e.preventDefault();
    if(!isOnline) return alert("❌ Se requiere internet.");
    
    const m_id = formulario.marca_id || marcasLista[0]?.id;
    const c_id = formulario.categoria_id || categoriasLista[0]?.id;
    if(!m_id || !c_id) return alert("❌ Debes tener al menos una marca y una categoría registradas.");

    const datos = new FormData();
    datos.append('codigo_pieza', formulario.codigo_pieza); datos.append('descripcion', formulario.descripcion);
    datos.append('precio', formulario.precio || 0); datos.append('stock', formulario.stock || 0);
    datos.append('marca_id', m_id); datos.append('categoria_id', c_id);
    datos.append('vehiculos_compatibles', JSON.stringify(formulario.vehiculos_compatibles || []));
    datos.append('imagen_url_actual', formulario.imagen_url_actual);
    if (imagenArchivo) datos.append('imagen', imagenArchivo);

    try {
      setMensaje('⏳ Guardando repuesto...');
      const url = repuestoEditando ? `${URL_BACKEND}/api/productos/${formulario.id}` : `${URL_BACKEND}/api/productos`;
      const res = await fetch(url, { method: repuestoEditando ? 'PUT' : 'POST', body: datos });
      setMensaje('');
      if (res.ok) { alert('✅ Repuesto guardado'); cancelarEdicion(); cargarTodo(); } else { alert('❌ Error en base de datos al guardar.'); }
    } catch (e) { setMensaje(''); alert(`❌ Error de conexión al guardar repuesto.`); }
  };

  const editarRepuesto = (p) => { 
    setFormulario({ id: p.id, codigo_pieza: p.codigo_pieza, descripcion: p.descripcion, marca_id: p.marca_id, categoria_id: p.categoria_id, precio: p.precio, stock: p.stock, imagen_url_actual: p.imagen_url, vehiculos_compatibles: p.vehiculos_ids || [] }); 
    setRepuestoEditando(true); window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const cancelarEdicion = () => { 
    setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: marcasLista[0]?.id || '', categoria_id: categoriasLista[0]?.id || '', imagen_url_actual: '', vehiculos_compatibles: [] }); 
    setRepuestoEditando(false); setImagenArchivo(null); 
    const fileInput = document.getElementById('inputImagen'); if(fileInput) fileInput.value = '';
  };
  
  const borrarRepuesto = async (id) => { if(window.confirm('¿Borrar definitivamente?')) { await fetch(`${URL_BACKEND}/api/productos/${id}`, { method: 'DELETE' }); cargarTodo(); } };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      
      <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-slate-200 pb-4">
        <button onClick={()=>setTabActiva('POS')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'POS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>🛒 POS / Caja</button>
        <button onClick={()=>setTabActiva('INVENTARIO')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'INVENTARIO' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>📦 Inventario Físico</button>
        <button onClick={()=>setTabActiva('VEHICULOS')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'VEHICULOS' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>🚗 Compatibilidad Autos/Motos</button>
        <button onClick={()=>setTabActiva('AUDITORIA')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'AUDITORIA' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>💰 Auditoría de Pagos</button>
        <button onClick={()=>setTabActiva('CONFIG')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'CONFIG' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>⚙️ Configuración</button>
      </div>

      {mensaje && <div className="mb-6 p-4 rounded-xl font-black text-sm bg-blue-100 text-blue-800 border-2 border-blue-300 text-center animate-pulse">{mensaje}</div>}

      {tabActiva === 'VEHICULOS' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-900 text-lg mb-6">🚗 Catálogo de Modelos (Línea de Compatibilidad)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div><label className="block text-xs font-black text-slate-500 mb-1">MARCA (Ej: Chevrolet, Suzuki)</label><input type="text" className="w-full border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={nuevoVehiculo.marca_auto} onChange={e=>setNuevoVehiculo({...nuevoVehiculo, marca_auto: e.target.value})}/></div>
                <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">MODELO EXACTO (Ej: Aveo 2006-2015)</label><input type="text" className="w-full border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={nuevoVehiculo.modelo} onChange={e=>setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value})}/></div>
                <div className="flex items-end">
                    <button onClick={guardarVehiculo} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-black hover:bg-indigo-700 shadow-md">Registrar Línea</button>
                </div>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
                {vehiculosLista.map(v=>(
                    <div key={v.id} className="flex justify-between items-center p-4 bg-slate-50 border-2 border-slate-100 rounded-xl">
                        <span className="font-black text-slate-900 text-base">🚘 {v.marca_auto} {v.modelo}</span>
                        <button onClick={()=>accionSimple(`vehiculos/${v.id}`,'DELETE')} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-black hover:bg-red-100 transition">Retirar</button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {tabActiva === 'POS' && (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-white p-6 rounded-2xl border-2 border-slate-200">
                <input type="text" placeholder="Escribe el código a facturar..." className="w-full p-4 rounded-xl border-2 border-slate-300 bg-slate-50 font-bold mb-4 outline-none focus:border-blue-500" value={posBusqueda} onChange={(e) => setPosBusqueda(e.target.value)} autoFocus />
                <div className="divide-y-2 divide-slate-100">
                    {posBusqueda && inventario.filter(p => (p.codigo_pieza||'').toLowerCase().includes(posBusqueda.toLowerCase())).slice(0,6).map(p => (
                        <div key={p.id} onClick={() => posAgregar(p)} className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center transition">
                            <div><p className="font-black text-slate-900">{p.codigo_pieza}</p><p className="text-sm font-bold text-slate-500">Bodega: {p.stock}</p></div>
                            <p className="font-black text-emerald-600 text-xl">${p.precio}</p>
                        </div>
                    ))}
                </div>
            </div>
            <aside className="w-full lg:w-[400px] bg-white rounded-2xl border-2 border-slate-200 flex flex-col h-[38rem] shadow-lg">
                <div className="bg-slate-900 text-white p-5 rounded-t-xl font-black text-lg">🧾 Facturación Mostrador</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {posCarrito.length === 0 && <p className="text-center text-slate-400 font-bold mt-10">Bandeja vacía</p>}
                    {posCarrito.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded-xl border-2 border-slate-200 flex justify-between items-center shadow-sm">
                            <div><p className="font-black text-sm">{item.codigo_pieza}</p><p className="text-xs font-bold text-slate-500">{item.cantidad} x ${item.precio}</p></div>
                            <div className="flex items-center gap-3"><span className="font-black text-emerald-600">${(item.cantidad * item.precio).toFixed(2)}</span><button onClick={()=>posEliminar(item.id)} className="bg-red-100 text-red-600 w-8 h-8 rounded-lg font-black hover:bg-red-200 transition">X</button></div>
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t-2 border-slate-200">
                    <select className="w-full bg-slate-100 border-2 border-slate-300 p-3 rounded-xl font-black mb-4 outline-none" value={posMetodoPago} onChange={e=>setPosMetodoPago(e.target.value)}>
                        <option value="Efectivo USD">💵 Efectivo USD</option>
                        <option value="Efectivo BS">💵 Efectivo BS</option>
                        <option value="Pago Movil">📱 Pago Móvil</option>
                        <option value="Punto Venta">💳 Punto Venta</option>
                        <option value="Zelle">🇺🇸 Zelle</option>
                    </select>
                    {isOnline && (posMetodoPago === 'Pago Movil' || posMetodoPago === 'Zelle') && (
                        <input id="inputComp" type="file" accept="image/*" onChange={e=>setComprobanteArchivo(e.target.files[0])} className="w-full mb-4 text-sm font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-800"/>
                    )}
                    <div className="flex justify-between items-center mb-4"><span className="font-black text-slate-500">TOTAL NETO</span><span className="text-4xl font-black text-slate-900">${posTotal}</span></div>
                    <button onClick={procesarVenta} disabled={posCarrito.length===0} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl disabled:bg-slate-300 hover:bg-emerald-600 transition shadow-md">💰 REGISTRAR VENTA</button>
                </div>
            </aside>
        </div>
      )}

      {tabActiva === 'INVENTARIO' && (
        <div className="space-y-8">
            <div className={`bg-white p-6 rounded-2xl border-2 transition-all ${repuestoEditando ? 'border-orange-300 ring-4 ring-orange-50' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-900">{repuestoEditando ? '✏️ Editando Producto' : '➕ Registrar Producto'}</h2>
                    {repuestoEditando && <button onClick={cancelarEdicion} className="text-red-500 font-bold hover:underline">Cancelar Edición</button>}
                </div>
                <form onSubmit={guardarRepuesto} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">CÓDIGO DE PIEZA</label><input type="text" name="codigo_pieza" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={formulario.codigo_pieza} onChange={manejarCambio} required/></div>
                        <div><label className="block text-xs font-black text-slate-500 mb-1">PRECIO ($)</label><input type="number" step="0.01" name="precio" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-black text-emerald-700 outline-none focus:border-blue-500" value={formulario.precio} onChange={manejarCambio} required/></div>
                        <div><label className="block text-xs font-black text-slate-500 mb-1">CANTIDAD BODEGA</label><input type="number" name="stock" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-black text-blue-700 outline-none focus:border-blue-500" value={formulario.stock} onChange={manejarCambio} required/></div>
                        
                        <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">MARCA FABRICANTE</label><select name="marca_id" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={formulario.marca_id} onChange={manejarCambio}>{marcasLista.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                        <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">CATEGORÍA</label><select name="categoria_id" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={formulario.categoria_id} onChange={manejarCambio}>{categoriasLista.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                        
                        <div className="md:col-span-4"><label className="block text-xs font-black text-slate-500 mb-1">DESCRIPCIÓN COMERCIAL</label><input type="text" name="descripcion" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={formulario.descripcion} onChange={manejarCambio} required/></div>
                        
                        <div className="md:col-span-4"><label className="block text-xs font-black text-slate-500 mb-1">IMAGEN / FOTO DEL RECAMBIO</label><input id="inputImagen" type="file" accept="image/*" onChange={(e) => setImagenArchivo(e.target.files[0])} className="w-full text-sm font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-800 cursor-pointer"/></div>

                        <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                            <label className="block text-sm font-black text-indigo-700 mb-3">🚗 VEHÍCULOS COMPATIBLES</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-40 overflow-y-auto">
                                {vehiculosLista.map(v => (
                                    <label key={v.id} className="flex items-center gap-2 cursor-pointer bg-white p-2 border rounded-lg hover:bg-indigo-50">
                                        <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={(formulario.vehiculos_compatibles || []).includes(v.id)} onChange={() => toggleVehiculo(v.id)} />
                                        <span className="text-xs font-bold text-slate-700 truncate">{v.marca_auto} {v.modelo}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button type="submit" className={`w-full text-white font-black text-lg py-4 rounded-xl shadow-md ${repuestoEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>{repuestoEditando ? 'ACTUALIZAR EN INVENTARIO' : 'REGISTRAR EN INVENTARIO'}</button>
                </form>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left"><thead className="bg-slate-900 text-white"><tr className="font-black text-xs uppercase"><th className="p-4">Código / Descripción</th><th className="p-4">Compatibilidad</th><th className="p-4">PVP</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Controles</th></tr></thead>
                <tbody className="divide-y-2 divide-slate-100">
                    {inventario.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <div className="flex items-center gap-4">
                                    <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className="w-12 h-12 object-contain rounded-lg border bg-white" alt="Repuesto"/>
                                    <div><p className="font-black text-slate-900">{p.codigo_pieza}</p><p className="text-xs font-bold text-slate-500 truncate max-w-[200px]">{p.descripcion}</p></div>
                                </div>
                            </td>
                            <td className="p-4"><p className="text-xs font-bold text-indigo-600 bg-indigo-50 p-1.5 rounded inline-block truncate max-w-[200px]">{p.vehiculos_nombres || 'Genérico / Universal'}</p></td>
                            <td className="p-4 font-black text-emerald-600 text-lg">${p.precio}</td>
                            <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black ${p.stock > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{p.stock}</span></td>
                            <td className="p-4 flex gap-2 justify-end">
                                <button onClick={()=>editarRepuesto(p)} className="bg-slate-200 px-3 py-2 rounded-lg font-black text-slate-700 hover:bg-blue-200">Editar</button>
                                <button onClick={()=>borrarRepuesto(p.id)} className="bg-red-100 px-3 py-2 rounded-lg font-black text-red-600 hover:bg-red-200">X</button>
                            </td>
                        </tr>
                    ))}
                </tbody></table>
            </div>
        </div>
      )}

      {tabActiva === 'AUDITORIA' && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-900 text-white"><h2 className="text-xl font-black">💰 Conciliación y Auditoría Manual de Ventas</h2></div>
            <div className="overflow-x-auto p-6">
                <table className="w-full text-left">
                    <thead className="bg-slate-100"><tr className="font-black text-sm uppercase"><th className="p-4">Factura</th><th className="p-4">Fecha</th><th className="p-4">Método</th><th className="p-4 text-center">Monto</th><th className="p-4 text-center">Capture Digital</th><th className="p-4 text-right">Estatus</th></tr></thead>
                    <tbody className="divide-y-2 divide-slate-100">
                        {ventasList.length === 0 && <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-400">Aún no hay ventas registradas.</td></tr>}
                        {ventasList.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 font-black text-blue-600">#FAC-00{v.id}</td>
                                <td className="p-4 font-bold text-slate-500 text-xs">{new Date(v.fecha).toLocaleString()}</td>
                                <td className="p-4 font-black text-slate-700">{v.metodo_pago}</td>
                                <td className="p-4 font-black text-emerald-600 text-xl text-center">${v.total}</td>
                                <td className="p-4 text-center">
                                    {v.comprobante_url ? <a href={v.comprobante_url} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl font-black text-xs hover:bg-blue-200 transition">🔍 Abrir Comprobante</a> : <span className="text-slate-400 font-bold text-xs italic">Sin capture</span>}
                                </td>
                                <td className="p-4 text-right">
                                    {v.estado === 'Validado' ? ( <span className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg font-black text-sm">✅ Pago Conciliado</span> ) : ( <button onClick={()=>accionSimple(`ventas/${v.id}/validar`,'PUT')} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-black shadow-md text-sm transition">Validar Transacción</button> )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {tabActiva === 'CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200">
                <h3 className="font-black text-slate-900 text-lg mb-4">🏷️ Marcas Fabricantes</h3>
                <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="Ej: Bosch" className="border-2 p-3 rounded-xl flex-1 font-bold outline-none" value={nuevaMarca} onChange={e=>setNuevaMarca(e.target.value)}/>
                    <button onClick={()=>{ if(nuevaMarca.trim()==="")return; accionSimple('marcas','POST',{nombre:nuevaMarca}); }} className="bg-slate-900 text-white px-5 rounded-xl font-black">Añadir</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {marcasLista.map(m=>(
                        <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded-xl"><span className="font-black text-slate-700">{m.nombre}</span><button onClick={()=>accionSimple(`marcas/${m.id}`,'DELETE')} className="text-red-500 font-black">X</button></div>
                    ))}
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200">
                <h3 className="font-black text-slate-900 text-lg mb-4">📂 Categorías Estructurales</h3>
                <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="Ej: Motor" className="border-2 p-3 rounded-xl flex-1 font-bold outline-none" value={nuevaCategoria} onChange={e=>setNuevaCategoria(e.target.value)}/>
                    <button onClick={()=>{ if(nuevaCategoria.trim()==="")return; accionSimple('categorias','POST',{nombre:nuevaCategoria}); }} className="bg-slate-900 text-white px-5 rounded-xl font-black">Añadir</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {categoriasLista.map(c=>(
                        <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded-xl"><span className="font-black text-slate-700">{c.nombre}</span><button onClick={()=>accionSimple(`categorias/${c.id}`,'DELETE')} className="text-red-500 font-black">X</button></div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Admin;