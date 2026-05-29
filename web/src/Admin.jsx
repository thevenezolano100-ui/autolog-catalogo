import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import localforage from 'localforage';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com';

function Admin() {
  const [tabActiva, setTabActiva] = useState('POS'); // Pestañas: POS, INVENTARIO, CONFIG
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mensaje, setMensaje] = useState('');
  
  // ESTADOS DE INVENTARIO Y CONFIGURACIÓN
  const [inventario, setInventario] = useState([]);
  const [categoriasLista, setCategoriasLista] = useState([]);
  const [marcasLista, setMarcasLista] = useState([]);
  const [vehiculosLista, setVehiculosLista] = useState([]);
  const [ventasPendientesOffline, setVentasPendientesOffline] = useState(0);

  // ESTADOS DE FORMULARIOS
  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: '', categoria_id: '', vehiculos_compatibles: [] });
  const [repuestoEditando, setRepuestoEditando] = useState(false);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ marca_auto: '', modelo: '', anio_inicio: '', anio_fin: '', motor: '' });

  // ESTADOS POS (CAJA REGISTRADORA)
  const [posCarrito, setPosCarrito] = useState([]);
  const [posBusqueda, setPosBusqueda] = useState('');
  const [posMetodoPago, setPosMetodoPago] = useState('Efectivo USD');
  const [comprobanteArchivo, setComprobanteArchivo] = useState(null);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); sincronizarVentasOffline(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cargarTodo();
    contarVentasOffline();

    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const contarVentasOffline = async () => {
    const pendientes = await localforage.getItem('ventas_pendientes') || [];
    setVentasPendientesOffline(pendientes.length);
  };

  const cargarTodo = async () => {
    try {
      const [resInv, resCat, resMar, resVeh] = await Promise.all([
        fetch(`${URL_BACKEND}/api/productos`), fetch(`${URL_BACKEND}/api/categorias`), 
        fetch(`${URL_BACKEND}/api/marcas`), fetch(`${URL_BACKEND}/api/vehiculos`)
      ]);
      const dataInv = await resInv.json(); const dataCat = await resCat.json();
      const dataMar = await resMar.json(); const dataVeh = await resVeh.json();

      setInventario(dataInv); setCategoriasLista(dataCat); setMarcasLista(dataMar); setVehiculosLista(dataVeh);
      
      await localforage.setItem('cache_productos', dataInv);
      if(!repuestoEditando) setFormulario(prev => ({ ...prev, categoria_id: dataCat[0]?.id || '', marca_id: dataMar[0]?.id || '' }));
    } catch (error) {
      const cache = await localforage.getItem('cache_productos');
      if(cache) setInventario(cache);
    }
  };

  const mostrarAlerta = (texto, tipo = 'info') => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 4000);
  };

  // ==========================================
  // SINCRONIZACIÓN OFFLINE
  // ==========================================
  const sincronizarVentasOffline = async () => {
    const pendientes = await localforage.getItem('ventas_pendientes') || [];
    if (pendientes.length === 0) return;

    mostrarAlerta(`🔄 Subiendo ${pendientes.length} ventas guardadas sin internet...`);
    let ventasExitosas = [];
    
    for (let venta of pendientes) {
      try {
        const res = await fetch(`${URL_BACKEND}/api/ventas`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metodo_pago: venta.metodo_pago, total: venta.total, detalles: JSON.stringify(venta.detalles) })
        });
        if (res.ok) ventasExitosas.push(venta.idOffline);
      } catch (err) { console.error(err); }
    }

    const restantes = pendientes.filter(v => !ventasExitosas.includes(v.idOffline));
    await localforage.setItem('ventas_pendientes', restantes);
    contarVentasOffline(); cargarTodo();
    if(ventasExitosas.length > 0) mostrarAlerta(`✅ ¡Sincronización exitosa de ${ventasExitosas.length} ventas!`);
  };

  // ==========================================
  // CAJA REGISTRADORA (POS)
  // ==========================================
  const posAgregar = (producto) => {
    if (producto.stock <= 0) return;
    setPosCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { alert('Stock insuficiente'); return prev; }
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setPosBusqueda('');
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
            mostrarAlerta('⏳ Procesando pago...');
            const res = await fetch(`${URL_BACKEND}/api/ventas`, { method: 'POST', body: formData });
            if(res.ok) { mostrarAlerta('✅ Venta registrada en la nube.'); setPosCarrito([]); setComprobanteArchivo(null); document.getElementById('inputComp').value = ''; cargarTodo(); } 
            else mostrarAlerta('❌ Error del servidor al vender.');
        } catch (e) { mostrarAlerta('❌ Falla de red.'); }
    } else {
        const ventaOffline = { ...datosVenta, idOffline: Date.now() };
        const pendientes = await localforage.getItem('ventas_pendientes') || [];
        await localforage.setItem('ventas_pendientes', [...pendientes, ventaOffline]);
        
        const invActualizado = inventario.map(prod => {
            const vendido = posCarrito.find(p => p.id === prod.id);
            if (vendido) return { ...prod, stock: prod.stock - vendido.cantidad };
            return prod;
        });
        setInventario(invActualizado); await localforage.setItem('cache_productos', invActualizado);
        setPosCarrito([]); setComprobanteArchivo(null);
        mostrarAlerta('⚠️ Venta guardada LOCALMENTE. Se subirá al tener internet.'); contarVentasOffline();
    }
  };

  const posBuscados = inventario.filter(p => (p.codigo_pieza||'').toLowerCase().includes(posBusqueda.toLowerCase()) || (p.descripcion||'').toLowerCase().includes(posBusqueda.toLowerCase())).slice(0, 6);

  // ==========================================
  // INVENTARIO Y EXCEL
  // ==========================================
  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });
  
  const guardarRepuesto = async (e) => {
    e.preventDefault();
    if(!isOnline) return alert("❌ Se requiere internet para modificar inventario maestro.");
    const datos = new FormData();
    Object.keys(formulario).forEach(key => { if(key !== 'vehiculos_compatibles') datos.append(key, formulario[key] || ''); });
    datos.append('vehiculos_compatibles', JSON.stringify(formulario.vehiculos_compatibles));
    if (imagenArchivo) datos.append('imagen', imagenArchivo);
    const url = repuestoEditando ? `${URL_BACKEND}/api/productos/${formulario.id}` : `${URL_BACKEND}/api/productos`;
    const metodo = repuestoEditando ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method: metodo, body: datos });
      if (res.ok) { mostrarAlerta('✅ Repuesto guardado'); cancelarEdicion(); cargarTodo(); }
    } catch (e) { mostrarAlerta('❌ Error al guardar'); }
  };

  const editarRepuesto = (p) => { setFormulario({ id: p.id, codigo_pieza: p.codigo_pieza, descripcion: p.descripcion, marca_id: p.marca_id, categoria_id: p.categoria_id, precio: p.precio, stock: p.stock, vehiculos_compatibles: p.vehiculos_compatibles || [] }); setRepuestoEditando(true); window.scrollTo(0,0); };
  const cancelarEdicion = () => { setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: marcasLista[0]?.id, categoria_id: categoriasLista[0]?.id, vehiculos_compatibles: [] }); setRepuestoEditando(false); setImagenArchivo(null); };
  const borrarRepuesto = async (id) => { if(window.confirm('¿Borrar definitivamente?')) { await fetch(`${URL_BACKEND}/api/productos/${id}`, { method: 'DELETE' }); cargarTodo(); } };

  const procesarExcel = (e) => {
    if(!isOnline) return alert("❌ Necesitas internet para cargas masivas.");
    const archivo = e.target.files[0]; if (!archivo) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      mostrarAlerta('⚙️ Analizando archivo Excel...');
      const libro = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]]);
      for (let f of filas) {
        const formData = new FormData();
        formData.append('codigo_pieza', f.codigo); formData.append('descripcion', f.descripcion);
        formData.append('precio', f.precio || 0); formData.append('stock', f.stock || 0);
        formData.append('marca_id', marcasLista[0]?.id); formData.append('categoria_id', categoriasLista[0]?.id);
        await fetch(`${URL_BACKEND}/api/productos`, { method: 'POST', body: formData });
      }
      mostrarAlerta('✅ Excel sincronizado correctamente.'); cargarTodo();
    };
    reader.readAsArrayBuffer(archivo);
  };

  // ==========================================
  // CONFIGURACIÓN (MARCAS, CATEGORIAS, AUTOS)
  // ==========================================
  const accionSimple = async (ruta, metodo, cuerpo) => { 
    if(!isOnline) return alert("Modo offline activo.");
    await fetch(`${URL_BACKEND}/api/${ruta}`, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(cuerpo) }); cargarTodo(); 
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      
      {/* MENÚ DE NAVEGACIÓN ADMINISTRATIVA */}
      <div className="flex flex-wrap gap-3 mb-8 border-b-2 border-slate-200 pb-4">
        <button onClick={()=>setTabActiva('POS')} className={`text-base font-black px-5 py-3 rounded-xl transition ${tabActiva === 'POS' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>🛒 Punto de Venta</button>
        <button onClick={()=>setTabActiva('INVENTARIO')} className={`text-base font-black px-5 py-3 rounded-xl transition ${tabActiva === 'INVENTARIO' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>📦 Inventario Físico</button>
        <button onClick={()=>setTabActiva('CONFIG')} className={`text-base font-black px-5 py-3 rounded-xl transition ${tabActiva === 'CONFIG' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>⚙️ Configuración</button>
        
        <div className="ml-auto flex items-center gap-3">
          {ventasPendientesOffline > 0 && (
            <button onClick={sincronizarVentasOffline} className="bg-orange-500 text-white font-black px-4 py-2 rounded-xl text-sm shadow hover:bg-orange-600">
              ⚠️ {ventasPendientesOffline} Ventas en Cola
            </button>
          )}
          <div className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${isOnline ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
            {isOnline ? '🟢 SISTEMA ONLINE' : '🔴 MODO OFFLINE'}
          </div>
        </div>
      </div>

      {mensaje && <div className="mb-6 p-4 rounded-xl font-black text-sm bg-blue-100 text-blue-800 border-2 border-blue-300 text-center">{mensaje}</div>}

      {/* ---------------------------------------------------- */}
      {/* PESTAÑA 1: CAJA REGISTRADORA (POS)                   */}
      {/* ---------------------------------------------------- */}
      {tabActiva === 'POS' && (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm relative">
                    <h2 className="font-black text-slate-900 text-xl mb-4">🔍 Lector de Mostrador</h2>
                    <input type="text" placeholder="Escribe el código o pieza a facturar..." className="w-full p-4 rounded-xl border-2 border-slate-300 bg-slate-50 text-lg font-bold text-slate-900 outline-none focus:border-blue-500" value={posBusqueda} onChange={(e) => setPosBusqueda(e.target.value)} autoFocus />
                    
                    {posBusqueda && (
                        <div className="absolute left-6 right-6 mt-2 bg-white border-2 border-slate-300 rounded-xl shadow-2xl z-50 divide-y-2 divide-slate-100">
                            {posBuscados.map(p => (
                                <div key={p.id} onClick={() => posAgregar(p)} className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 ${p.stock <= 0 ? 'opacity-50' : ''}`}>
                                    <div><p className="font-black text-slate-900 text-lg">{p.codigo_pieza}</p><p className="text-sm font-bold text-slate-600">{p.descripcion} • <span className={p.stock > 0 ? "text-blue-600" : "text-red-500"}>Stock: {p.stock}</span></p></div>
                                    <p className="font-black text-emerald-600 text-xl">${p.precio}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <aside className="w-full lg:w-[400px]">
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg flex flex-col h-[36rem]">
                    <div className="bg-slate-900 text-white p-5 rounded-t-xl"><h2 className="font-black text-xl">🧾 Ticket Pasantías Anderson</h2></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {posCarrito.map((item) => (
                            <div key={item.id} className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm flex justify-between items-center">
                                <div><p className="font-black text-slate-900">{item.codigo_pieza}</p><p className="text-sm font-bold text-slate-600">{item.cantidad} x ${item.precio}</p></div>
                                <div className="flex items-center gap-4"><span className="font-black text-emerald-600 text-lg">${(item.cantidad * item.precio).toFixed(2)}</span><button onClick={()=>posEliminar(item.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded-lg font-black hover:bg-red-200">X</button></div>
                            </div>
                        ))}
                    </div>
                    <div className="p-5 bg-white border-t-2 border-slate-200 rounded-b-xl">
                        <label className="block text-sm font-black text-slate-700 mb-2">MÉTODO DE PAGO</label>
                        <select className="w-full bg-slate-100 border-2 border-slate-300 p-3 rounded-xl font-black text-slate-900 mb-4 outline-none" value={posMetodoPago} onChange={e=>setPosMetodoPago(e.target.value)}>
                            <option value="Efectivo USD">💵 Efectivo Dólares</option>
                            <option value="Pago Movil">📱 Pago Móvil</option>
                            <option value="Punto Venta">💳 Punto de Venta</option>
                            <option value="Zelle">🇺🇸 Zelle</option>
                        </select>
                        {isOnline && (posMetodoPago === 'Pago Movil' || posMetodoPago === 'Zelle') && (
                            <div className="mb-4"><label className="block text-sm font-black text-slate-700 mb-2">CAPTURE DE PAGO</label><input id="inputComp" type="file" onChange={(e) => setComprobanteArchivo(e.target.files[0])} className="w-full text-sm font-bold text-slate-700 file:bg-blue-100 file:text-blue-800 file:border-0 file:rounded-lg file:px-4 file:py-2"/></div>
                        )}
                        <div className="flex justify-between items-center mb-4"><span className="font-black text-slate-500">TOTAL FACTURA</span><span className="text-4xl font-black text-slate-900">${posTotal}</span></div>
                        <button onClick={procesarVenta} disabled={posCarrito.length===0} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg py-4 rounded-xl disabled:bg-slate-300">💰 FACTURAR Y COBRAR</button>
                    </div>
                </div>
            </aside>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PESTAÑA 2: INVENTARIO MAESTRO                        */}
      {/* ---------------------------------------------------- */}
      {tabActiva === 'INVENTARIO' && (
        <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{repuestoEditando ? '✏️ Editar Repuesto' : '➕ Nuevo Repuesto'}</h2>
                <form onSubmit={guardarRepuesto} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2"><label className="font-black text-sm text-slate-700 block mb-1">CÓDIGO</label><input type="text" name="codigo_pieza" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold text-slate-900" value={formulario.codigo_pieza} onChange={manejarCambio} required/></div>
                    <div><label className="font-black text-sm text-slate-700 block mb-1">PRECIO ($)</label><input type="number" step="0.01" name="precio" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-black text-emerald-700" value={formulario.precio} onChange={manejarCambio} required/></div>
                    <div><label className="font-black text-sm text-slate-700 block mb-1">STOCK INICIAL</label><input type="number" name="stock" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-black text-blue-700" value={formulario.stock} onChange={manejarCambio} required/></div>
                    <div className="md:col-span-4"><label className="font-black text-sm text-slate-700 block mb-1">DESCRIPCIÓN TÉCNICA</label><input type="text" name="descripcion" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold text-slate-900" value={formulario.descripcion} onChange={manejarCambio} required/></div>
                    <div className="md:col-span-4 mt-2"><button type="submit" className="w-full bg-slate-900 text-white font-black text-lg py-4 rounded-xl hover:bg-blue-600">💾 GUARDAR REPUESTO EN BODEGA</button></div>
                </form>
            </div>

            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-300 flex items-center justify-between">
                <div><h2 className="font-black text-emerald-800 text-lg">📊 Carga Masiva desde Excel (.xlsx)</h2><p className="text-sm font-bold text-emerald-700 mt-1">Usa columnas: codigo, descripcion, precio, stock</p></div>
                <input type="file" accept=".xlsx" onChange={procesarExcel} className="font-black text-emerald-800 file:bg-white file:border-2 file:border-emerald-300 file:rounded-xl file:px-4 file:py-2 cursor-pointer"/>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                <table className="w-full text-left"><thead className="bg-slate-900 text-white"><tr className="font-black text-sm"><th className="p-4">CÓDIGO</th><th className="p-4">PIEZA</th><th className="p-4">PVP</th><th className="p-4">STOCK</th><th className="p-4 text-right">ACCIONES</th></tr></thead>
                <tbody className="divide-y-2 divide-slate-100">
                    {inventario.map(p => (<tr key={p.id} className="hover:bg-slate-50"><td className="p-4 font-black text-slate-900">{p.codigo_pieza}</td><td className="p-4 font-bold text-slate-700 truncate max-w-[200px]">{p.descripcion}</td><td className="p-4 font-black text-emerald-600">${p.precio}</td><td className="p-4 font-black text-blue-600">{p.stock}</td><td className="p-4 flex gap-2 justify-end"><button onClick={()=>editarRepuesto(p)} className="bg-slate-200 px-3 py-1.5 rounded-lg font-black text-slate-700 hover:bg-blue-200">Editar</button><button onClick={()=>borrarRepuesto(p.id)} className="bg-red-100 px-3 py-1.5 rounded-lg font-black text-red-700 hover:bg-red-200">X</button></td></tr>))}
                </tbody></table>
            </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PESTAÑA 3: CONFIGURACIÓN (MARCAS, CATEGORIAS)        */}
      {/* ---------------------------------------------------- */}
      {tabActiva === 'CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200">
                <h3 className="font-black text-slate-900 text-lg mb-4">🏷️ Gestionar Marcas</h3>
                <div className="flex gap-2 mb-4"><input type="text" placeholder="Ej: Bosch" className="flex-1 border-2 border-slate-300 p-3 rounded-xl font-bold bg-slate-50" value={nuevaMarca} onChange={e=>setNuevaMarca(e.target.value)}/><button onClick={()=>{accionSimple('marcas','POST',{nombre:nuevaMarca}); setNuevaMarca('');}} className="bg-slate-900 text-white px-5 rounded-xl font-black">+</button></div>
                <div className="max-h-60 overflow-y-auto space-y-2">{marcasLista.map(m=><div key={m.id} className="flex justify-between p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700"><span>{m.nombre}</span><button onClick={()=>accionSimple(`marcas/${m.id}`,'DELETE')} className="text-red-500 font-black hover:text-red-700">X</button></div>)}</div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200">
                <h3 className="font-black text-slate-900 text-lg mb-4">📂 Categorías de Repuestos</h3>
                <div className="flex gap-2 mb-4"><input type="text" placeholder="Ej: Frenos" className="flex-1 border-2 border-slate-300 p-3 rounded-xl font-bold bg-slate-50" value={nuevaCategoria} onChange={e=>setNuevaCategoria(e.target.value)}/><button onClick={()=>{accionSimple('categorias','POST',{nombre:nuevaCategoria}); setNuevaCategoria('');}} className="bg-slate-900 text-white px-5 rounded-xl font-black">+</button></div>
                <div className="max-h-60 overflow-y-auto space-y-2">{categoriasLista.map(c=><div key={c.id} className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700">{c.nombre}</div>)}</div>
            </div>
        </div>
      )}

    </div>
  );
}

export default Admin;