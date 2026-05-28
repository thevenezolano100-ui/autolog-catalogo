import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import localforage from 'localforage';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com';

function Admin() {
  const [tabActiva, setTabActiva] = useState('POS'); // Pestañas: 'POS' o 'INVENTARIO'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // ESTADOS DEL INVENTARIO
  const [inventario, setInventario] = useState([]);
  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '' });
  const [mensaje, setMensaje] = useState('');
  const [ventasPendientesOffline, setVentasPendientesOffline] = useState(0);

  // ESTADOS DE LA CAJA REGISTRADORA (POS)
  const [posCarrito, setPosCarrito] = useState([]);
  const [posBusqueda, setPosBusqueda] = useState('');
  const [posMetodoPago, setPosMetodoPago] = useState('Efectivo');
  const [comprobanteArchivo, setComprobanteArchivo] = useState(null);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); sincronizarVentasOffline(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cargarDatosBasicos();
    contarVentasOffline();

    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const contarVentasOffline = async () => {
    const pendientes = await localforage.getItem('ventas_pendientes') || [];
    setVentasPendientesOffline(pendientes.length);
  };

  const cargarDatosBasicos = async () => {
    try {
      const resInv = await fetch(`${URL_BACKEND}/api/productos`);
      const data = await resInv.json();
      setInventario(data);
      await localforage.setItem('cache_productos', data);
    } catch (error) {
      const cache = await localforage.getItem('cache_productos');
      if(cache) setInventario(cache);
    }
  };

  // ========================================================
  // MOTOR DE SINCRONIZACIÓN EN SEGUNDO PLANO (BACKGROUND SYNC)
  // ========================================================
  const sincronizarVentasOffline = async () => {
    const pendientes = await localforage.getItem('ventas_pendientes') || [];
    if (pendientes.length === 0) return;

    setMensaje(`🔄 Sincronizando ${pendientes.length} ventas locales con la nube...`);
    
    let ventasExitosas = [];
    for (let venta of pendientes) {
      try {
        // Como no podemos guardar fotos offline en un FormData fácilmente, enviamos solo los datos JSON
        const res = await fetch(`${URL_BACKEND}/api/ventas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metodo_pago: venta.metodo_pago,
            total: venta.total,
            detalles: JSON.stringify(venta.detalles)
          })
        });
        
        if (res.ok) ventasExitosas.push(venta.idOffline);
      } catch (err) { console.error("Fallo al sincronizar venta", err); }
    }

    // Filtra las ventas que ya se subieron exitosamente y deja las que fallaron para otro intento
    const ventasRestantes = pendientes.filter(v => !ventasExitosas.includes(v.idOffline));
    await localforage.setItem('ventas_pendientes', ventasRestantes);
    contarVentasOffline();
    cargarDatosBasicos(); // Refresca el stock real desde la nube

    if(ventasExitosas.length > 0) {
        setMensaje(`✅ Se sincronizaron ${ventasExitosas.length} ventas con el servidor.`);
        setTimeout(() => setMensaje(''), 5000);
    }
  };

  // ========================================================
  // LÓGICA DE LA CAJA REGISTRADORA (POS)
  // ========================================================
  const posAgregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return;
    setPosCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { alert('Límite de stock local alcanzado.'); return prev; }
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setPosBusqueda(''); // Limpia el buscador al agregar
  };

  const posEliminarDelCarrito = (id) => setPosCarrito(prev => prev.filter(i => i.id !== id));
  const posTotal = posCarrito.reduce((t, i) => t + (parseFloat(i.precio || 0) * i.cantidad), 0).toFixed(2);

  const procesarVenta = async () => {
    if(posCarrito.length === 0) return;

    const datosVenta = {
        metodo_pago: posMetodoPago,
        total: posTotal,
        detalles: posCarrito.map(p => ({ id: p.id, cantidad: p.cantidad, precio: p.precio }))
    };

    if (isOnline) {
        // PROCESAMIENTO NORMAL EN LA NUBE (Soporta envío de foto del comprobante)
        const formData = new FormData();
        formData.append('metodo_pago', datosVenta.metodo_pago);
        formData.append('total', datosVenta.total);
        formData.append('detalles', JSON.stringify(datosVenta.detalles));
        if (comprobanteArchivo) formData.append('comprobante', comprobanteArchivo);

        try {
            setMensaje('⚙️ Procesando pago y descontando stock...');
            const res = await fetch(`${URL_BACKEND}/api/ventas`, { method: 'POST', body: formData });
            if(res.ok) {
                setMensaje('✅ Venta registrada exitosamente.');
                setPosCarrito([]); setComprobanteArchivo(null); document.getElementById('inputComprobante').value = '';
                cargarDatosBasicos();
            } else { setMensaje('❌ Error en el servidor al registrar venta.'); }
        } catch (error) { setMensaje('❌ Error de conexión al procesar venta.'); }
    } else {
        // PROCESAMIENTO OFFLINE: Se guarda en memoria y descuenta stock visual
        const ventaOffline = { ...datosVenta, idOffline: Date.now() };
        const pendientesActuales = await localforage.getItem('ventas_pendientes') || [];
        await localforage.setItem('ventas_pendientes', [...pendientesActuales, ventaOffline]);
        
        // Descontamos visualmente el stock de la memoria local para que no sobrevendan
        const inventarioActualizado = inventario.map(prod => {
            const itemVendido = posCarrito.find(p => p.id === prod.id);
            if (itemVendido) return { ...prod, stock: prod.stock - itemVendido.cantidad };
            return prod;
        });
        setInventario(inventarioActualizado);
        await localforage.setItem('cache_productos', inventarioActualizado);

        setPosCarrito([]); setComprobanteArchivo(null);
        setMensaje('⚠️ Venta guardada localmente. Se subirá a la nube al recuperar conexión.');
        contarVentasOffline();
    }
    setTimeout(() => setMensaje(''), 4000);
  };

  const posProductosFiltrados = inventario.filter(p => (p.codigo_pieza||'').toLowerCase().includes(posBusqueda.toLowerCase()) || (p.descripcion||'').toLowerCase().includes(posBusqueda.toLowerCase())).slice(0, 5); // Muestra maximo 5 resultados rápidos

  // ========================================================
  // LÓGICA DE INVENTARIO Y EXCEL (MANTENIDA)
  // ========================================================
  const procesarExcel = (e) => {
    if(!isOnline) return alert("Necesitas conexión a internet para cargas masivas.");
    const archivo = e.target.files[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = async (evento) => {
      setMensaje('⚙️ Procesando Excel...');
      const libro = XLSX.read(new Uint8Array(evento.target.result), { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]]);
      for (let fila of filas) {
        const formData = new FormData();
        formData.append('codigo_pieza', fila.codigo);
        formData.append('descripcion', fila.descripcion);
        formData.append('precio', fila.precio || 0);
        formData.append('stock', fila.stock || 0);
        await fetch(`${URL_BACKEND}/api/productos`, { method: 'POST', body: formData });
      }
      cargarDatosBasicos(); setMensaje('✅ Excel cargado'); setTimeout(() => setMensaje(''), 3000);
    };
    reader.readAsArrayBuffer(archivo);
  };

  const guardarRepuesto = async (e) => {
    e.preventDefault();
    if(!isOnline) return alert("Necesitas conexión a internet para crear productos nuevos.");
    const datos = new FormData();
    datos.append('codigo_pieza', formulario.codigo_pieza); datos.append('descripcion', formulario.descripcion);
    datos.append('precio', formulario.precio || 0); datos.append('stock', formulario.stock || 0);
    await fetch(`${URL_BACKEND}/api/productos`, { method: 'POST', body: datos });
    setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '' });
    cargarDatosBasicos(); setMensaje('✅ Repuesto creado'); setTimeout(() => setMensaje(''), 3000);
  };


  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      
      {/* MENÚ DE PESTAÑAS Y ESTADO */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4">
        <div className="flex gap-4">
            <button onClick={()=>setTabActiva('POS')} className={`text-xl font-black px-4 py-2 rounded-lg transition ${tabActiva === 'POS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>Caja Registradora</button>
            <button onClick={()=>setTabActiva('INVENTARIO')} className={`text-xl font-black px-4 py-2 rounded-lg transition ${tabActiva === 'INVENTARIO' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>Inventario Maestro</button>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
            {ventasPendientesOffline > 0 && (
                <button onClick={sincronizarVentasOffline} className="bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-orange-200 transition">
                    ⚠️ {ventasPendientesOffline} ventas pendientes <span>🔄 Sincronizar</span>
                </button>
            )}
            <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                {isOnline ? 'Sistema Online' : 'Modo Offline (Solo Ventas)'}
            </div>
        </div>
      </div>

      {mensaje && <div className="mb-6 p-4 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">{mensaje}</div>}

      {/* ========================================================= */}
      {/* PESTAÑA: PUNTO DE VENTA (CAJA REGISTRADORA) */}
      {/* ========================================================= */}
      {tabActiva === 'POS' && (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* LADO IZQUIERDO: BUSCADOR Y LISTA RÁPIDA */}
            <div className="flex-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm relative">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🔍 Lector / Buscador de Repuestos</h2>
                    <input type="text" placeholder="Escanea código de barras o escribe pieza..." className="w-full p-4 rounded-xl border bg-slate-50 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" value={posBusqueda} onChange={(e) => setPosBusqueda(e.target.value)} autoFocus />
                    
                    {/* RESULTADOS RÁPIDOS */}
                    {posBusqueda && (
                        <div className="absolute left-6 right-6 mt-2 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden divide-y">
                            {posProductosFiltrados.map(p => (
                                <div key={p.id} onClick={() => posAgregarAlCarrito(p)} className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <div><p className="font-bold">{p.codigo_pieza}</p><p className="text-xs text-slate-500">{p.descripcion} • Stock: {p.stock}</p></div>
                                    <div className="text-right"><p className="font-black text-emerald-600">${p.precio}</p></div>
                                </div>
                            ))}
                            {posProductosFiltrados.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">No se encontró el repuesto.</div>}
                        </div>
                    )}
                </div>

                {/* BOTONES DE ATAJO (Opcional visual) */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow flex items-center justify-center font-bold opacity-50 cursor-not-allowed">🏷️ Promociones</div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-2xl shadow flex items-center justify-center font-bold opacity-50 cursor-not-allowed">👥 Clientes Taller</div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-2xl shadow flex items-center justify-center font-bold opacity-50 cursor-not-allowed">📦 Devoluciones</div>
                </div>
            </div>

            {/* LADO DERECHO: TICKET DE COMPRA */}
            <aside className="w-full lg:w-[400px]">
                <div className="bg-white rounded-2xl border shadow-xl flex flex-col h-[32rem]">
                    <div className="bg-slate-900 text-white p-4 rounded-t-2xl"><h2 className="font-black text-lg">Ticket de Venta</h2><p className="text-xs text-slate-400">Pasantías Anderson - Terminal POS-01</p></div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {posCarrito.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-400"><span className="text-4xl mb-2">🧾</span><p className="font-medium text-sm">Escanea un repuesto para iniciar venta.</p></div>}
                        {posCarrito.map((item, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center group">
                                <div><p className="font-bold text-sm">{item.codigo_pieza}</p><p className="text-xs text-slate-500">{item.cantidad} x ${item.precio}</p></div>
                                <div className="flex items-center gap-3"><span className="font-black text-emerald-600">${(item.cantidad * item.precio).toFixed(2)}</span><button onClick={()=>posEliminarDelCarrito(item.id)} className="w-6 h-6 bg-red-50 text-red-500 rounded font-bold opacity-0 group-hover:opacity-100 transition">x</button></div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-white border-t rounded-b-2xl">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Método de Pago</label>
                            <select className="w-full bg-slate-50 border p-2 rounded-lg font-bold text-slate-700 outline-none" value={posMetodoPago} onChange={e=>setPosMetodoPago(e.target.value)}>
                                <option value="Efectivo USD">💵 Efectivo (Divisas)</option>
                                <option value="Efectivo BS">💵 Efectivo (Bolívares)</option>
                                <option value="Pago Movil">📱 Pago Móvil</option>
                                <option value="Zelle">🇺🇸 Zelle</option>
                                <option value="Punto Venta">💳 Tarjeta (Punto Venta)</option>
                            </select>
                        </div>

                        {/* INPUT PARA FOTO DEL PAGO (Solo si hay internet) */}
                        {isOnline && (posMetodoPago === 'Pago Movil' || posMetodoPago === 'Zelle') && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Comprobante (Capture)</label>
                                <input id="inputComprobante" type="file" accept="image/*" onChange={(e) => setComprobanteArchivo(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 font-bold cursor-pointer"/>
                            </div>
                        )}

                        <div className="flex justify-between items-end mb-4 pt-2 border-t border-dashed border-slate-300">
                            <span className="text-sm font-bold text-slate-500">TOTAL A COBRAR</span>
                            <span className="text-3xl font-black text-slate-900">${posTotal}</span>
                        </div>

                        <button onClick={procesarVenta} disabled={posCarrito.length === 0} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition disabled:bg-slate-200 disabled:text-slate-400 shadow-md flex justify-center items-center gap-2">
                            💰 PROCESAR VENTA
                        </button>
                    </div>
                </div>
            </aside>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA: INVENTARIO MAESTRO (CRUD Y EXCEL) */}
      {/* ========================================================= */}
      {tabActiva === 'INVENTARIO' && (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border">
                <h2 className="text-xl font-black mb-6">Añadir Repuesto Individual</h2>
                <form onSubmit={guardarRepuesto} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full"><label className="text-xs font-bold text-slate-500">CÓDIGO</label><input type="text" name="codigo_pieza" className="border bg-slate-50 p-3 rounded-lg w-full outline-none focus:ring-2" value={formulario.codigo_pieza} onChange={e=>setFormulario({...formulario, codigo_pieza: e.target.value})} required/></div>
                    <div className="w-full"><label className="text-xs font-bold text-slate-500">DESCRIPCIÓN</label><input type="text" name="descripcion" className="border bg-slate-50 p-3 rounded-lg w-full outline-none focus:ring-2" value={formulario.descripcion} onChange={e=>setFormulario({...formulario, descripcion: e.target.value})} required/></div>
                    <div className="w-32"><label className="text-xs font-bold text-slate-500">PRECIO ($)</label><input type="number" step="0.01" name="precio" className="border bg-slate-50 p-3 rounded-lg w-full outline-none focus:ring-2" value={formulario.precio} onChange={e=>setFormulario({...formulario, precio: e.target.value})}/></div>
                    <div className="w-32"><label className="text-xs font-bold text-slate-500">STOCK INICIAL</label><input type="number" name="stock" className="border bg-slate-50 p-3 rounded-lg w-full outline-none focus:ring-2" value={formulario.stock} onChange={e=>setFormulario({...formulario, stock: e.target.value})}/></div>
                    <button type="submit" disabled={!isOnline} className="bg-slate-900 text-white font-bold p-3 rounded-lg h-12 hover:bg-blue-600 transition disabled:opacity-50">Guardar</button>
                </form>
            </div>

            <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-200">
                <h2 className="font-black text-emerald-700 mb-2">Carga Masiva (Excel)</h2>
                <p className="text-sm text-emerald-600 mb-4">Columnas necesarias: codigo, descripcion, precio, stock</p>
                <input type="file" accept=".xlsx" onChange={procesarExcel} disabled={!isOnline} className="p-2 file:bg-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:font-bold file:text-emerald-700 cursor-pointer"/>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4">Inventario Físico ({inventario.length})</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm"><thead className="bg-slate-100 border-b"><tr><th className="p-4 font-bold text-slate-600">Código</th><th className="p-4 font-bold text-slate-600">Descripción</th><th className="p-4 font-bold text-slate-600">Precio</th><th className="p-4 font-bold text-slate-600 text-center">Stock Actual</th></tr></thead>
                    <tbody className="divide-y">
                        {inventario.map(p => (<tr key={p.id} className="hover:bg-slate-50"><td className="p-4 font-bold">{p.codigo_pieza}</td><td className="p-4 text-slate-600 truncate max-w-xs">{p.descripcion}</td><td className="p-4 text-emerald-600 font-black">${p.precio}</td><td className="p-4 text-center font-bold"><span className={`px-3 py-1 rounded-full text-xs ${p.stock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{p.stock}</span></td></tr>))}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      <div className="text-center text-slate-400 text-xs pb-10 mt-12">Sistema de Autogestión | Pasantías Profesionales Anderson</div>
    </div>
  );
}
export default Admin;