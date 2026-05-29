import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import localforage from 'localforage';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com';

function Admin() {
  const [tabActiva, setTabActiva] = useState('POS'); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mensaje, setMensaje] = useState('');
  
  const [inventario, setInventario] = useState([]);
  const [categoriasLista, setCategoriasLista] = useState([]);
  const [marcasLista, setMarcasLista] = useState([]);
  const [ventasPendientesOffline, setVentasPendientesOffline] = useState(0);

  // FORMULARIO DE INVENTARIO COMPLETO
  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: '', categoria_id: '', imagen_url_actual: '' });
  const [repuestoEditando, setRepuestoEditando] = useState(false);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const [posCarrito, setPosCarrito] = useState([]);
  const [posBusqueda, setPosBusqueda] = useState('');
  const [posMetodoPago, setPosMetodoPago] = useState('Efectivo USD');
  const [comprobanteArchivo, setComprobanteArchivo] = useState(null);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); sincronizarVentasOffline(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    cargarTodo(); contarVentasOffline();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const contarVentasOffline = async () => { 
    const p = await localforage.getItem('ventas_pendientes') || []; 
    setVentasPendientesOffline(p.length); 
  };

  const cargarTodo = async () => {
    try {
      const [resInv, resCat, resMar] = await Promise.all([ fetch(`${URL_BACKEND}/api/productos`), fetch(`${URL_BACKEND}/api/categorias`), fetch(`${URL_BACKEND}/api/marcas`) ]);
      const dataInv = await resInv.json(); const dataCat = await resCat.json(); const dataMar = await resMar.json();
      
      setInventario(dataInv); setCategoriasLista(dataCat); setMarcasLista(dataMar);
      await localforage.setItem('cache_productos', dataInv);
      
      if(!repuestoEditando) {
        setFormulario(prev => ({ ...prev, categoria_id: dataCat[0]?.id || '', marca_id: dataMar[0]?.id || '' }));
      }
    } catch (e) {
      const cache = await localforage.getItem('cache_productos');
      if(cache) setInventario(cache);
    }
  };

  const mostrarAlerta = (texto) => { 
    setMensaje(texto); 
    setTimeout(() => setMensaje(''), 5000); 
  };

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
    if(exitosas.length > 0) mostrarAlerta(`✅ Sincronización exitosa.`);
  };

  // ==========================================
  // LÓGICA DE VENTAS (POS) CON REPORTE DE ERRORES
  // ==========================================
  const posAgregar = (producto) => {
    if (producto.stock <= 0) return;
    setPosCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { alert('Stock insuficiente en bodega'); return prev; }
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
        formData.append('metodo_pago', datosVenta.metodo_pago); 
        formData.append('total', datosVenta.total); 
        formData.append('detalles', JSON.stringify(datosVenta.detalles));
        if (comprobanteArchivo) formData.append('comprobante', comprobanteArchivo);
        
        try {
            mostrarAlerta('⏳ Procesando pago y conectando con base de datos...');
            const res = await fetch(`${URL_BACKEND}/api/ventas`, { method: 'POST', body: formData });
            
            if(res.ok) { 
                mostrarAlerta('✅ Venta registrada correctamente en la nube.'); 
                setPosCarrito([]); setComprobanteArchivo(null); 
                const fileInput = document.getElementById('inputComp');
                if(fileInput) fileInput.value = '';
                cargarTodo(); 
            } else { 
                // AQUI CAPTURAMOS EL ERROR EXACTO DEL SERVIDOR
                const errorData = await res.json();
                mostrarAlerta(`❌ Error BD: ${errorData.error || 'No se pudo guardar la venta. Verifica que las tablas SQL existan.'}`);
            }
        } catch (e) { 
            mostrarAlerta('❌ Falla de red al intentar contactar el servidor.'); 
        }
    } else {
        const vOffline = { ...datosVenta, idOffline: Date.now() };
        const p = await localforage.getItem('ventas_pendientes') || [];
        await localforage.setItem('ventas_pendientes', [...p, vOffline]);
        const invNew = inventario.map(prod => { const v = posCarrito.find(x => x.id === prod.id); return v ? { ...prod, stock: prod.stock - v.cantidad } : prod; });
        setInventario(invNew); await localforage.setItem('cache_productos', invNew);
        setPosCarrito([]); mostrarAlerta('⚠️ Venta guardada LOCALMENTE por falta de internet.'); contarVentasOffline();
    }
  };

  // ==========================================
  // LÓGICA DE INVENTARIO Y EXCEL
  // ==========================================
  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });
  
  const guardarRepuesto = async (e) => {
    e.preventDefault();
    if(!isOnline) return alert("❌ Se requiere internet para modificar la base de datos.");
    const datos = new FormData();
    datos.append('codigo_pieza', formulario.codigo_pieza);
    datos.append('descripcion', formulario.descripcion);
    datos.append('precio', formulario.precio || 0);
    datos.append('stock', formulario.stock || 0);
    datos.append('marca_id', formulario.marca_id);
    datos.append('categoria_id', formulario.categoria_id);
    datos.append('imagen_url_actual', formulario.imagen_url_actual);
    datos.append('vehiculos_compatibles', '[]');
    
    if (imagenArchivo) datos.append('imagen', imagenArchivo);
    
    try {
      const url = repuestoEditando ? `${URL_BACKEND}/api/productos/${formulario.id}` : `${URL_BACKEND}/api/productos`;
      const metodo = repuestoEditando ? 'PUT' : 'POST';
      const res = await fetch(url, { method: metodo, body: datos });
      if (res.ok) { 
        mostrarAlerta(repuestoEditando ? '✅ Repuesto actualizado' : '✅ Repuesto creado'); 
        cancelarEdicion(); 
        cargarTodo(); 
      } else {
        mostrarAlerta('❌ Error al guardar en base de datos');
      }
    } catch (e) { mostrarAlerta('❌ Error de conexión al guardar'); }
  };

  const editarRepuesto = (p) => { 
    setFormulario({ id: p.id, codigo_pieza: p.codigo_pieza, descripcion: p.descripcion, marca_id: p.marca_id, categoria_id: p.categoria_id, precio: p.precio, stock: p.stock, imagen_url_actual: p.imagen_url }); 
    setRepuestoEditando(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const cancelarEdicion = () => { 
    setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: marcasLista[0]?.id || '', categoria_id: categoriasLista[0]?.id || '', imagen_url_actual: '' }); 
    setRepuestoEditando(false); 
    setImagenArchivo(null); 
    const fileInput = document.getElementById('inputImagen');
    if(fileInput) fileInput.value = '';
  };
  
  const borrarRepuesto = async (id) => { 
    if(window.confirm('¿Borrar este repuesto definitivamente?')) { 
        await fetch(`${URL_BACKEND}/api/productos/${id}`, { method: 'DELETE' }); 
        cargarTodo(); 
    } 
  };

  // ==========================================
  // CONFIGURACIÓN (MARCAS Y CATEGORIAS)
  // ==========================================
  const accionSimple = async (ruta, metodo, cuerpo) => { 
    if(!isOnline) { alert("Modo offline activo. Conéctate para modificar esto."); return; }
    try {
        const res = await fetch(`${URL_BACKEND}/api/${ruta}`, { method, headers: {'Content-Type':'application/json'}, body: cuerpo ? JSON.stringify(cuerpo) : null }); 
        if(!res.ok) {
            const err = await res.json();
            alert(`Error: ${err.error || 'No se pudo procesar la solicitud'}`);
        }
        cargarTodo(); 
    } catch(e) { alert("Error de red"); }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      
      {/* MENÚ SUPERIOR DE PESTAÑAS */}
      <div className="flex flex-wrap gap-3 mb-8 border-b-2 border-slate-200 pb-4">
        <button onClick={()=>setTabActiva('POS')} className={`font-black px-5 py-3 rounded-xl transition-all ${tabActiva === 'POS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>🛒 Caja Registradora</button>
        <button onClick={()=>setTabActiva('INVENTARIO')} className={`font-black px-5 py-3 rounded-xl transition-all ${tabActiva === 'INVENTARIO' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>📦 Inventario Físico</button>
        <button onClick={()=>setTabActiva('CONFIG')} className={`font-black px-5 py-3 rounded-xl transition-all ${tabActiva === 'CONFIG' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>⚙️ Ajustes (Marcas)</button>
      </div>

      {mensaje && <div className="mb-6 p-4 rounded-xl font-black text-sm bg-blue-100 text-blue-800 border-2 border-blue-300 text-center animate-pulse">{mensaje}</div>}

      {/* PESTAÑA 1: POS */}
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

      {/* PESTAÑA 2: INVENTARIO FÍSICO Y CRUD */}
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
                        <div><label className="block text-xs font-black text-slate-500 mb-1">PRECIO DE VENTA ($)</label><input type="number" step="0.01" name="precio" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-black text-emerald-700 outline-none focus:border-blue-500" value={formulario.precio} onChange={manejarCambio} required/></div>
                        <div><label className="block text-xs font-black text-slate-500 mb-1">CANTIDAD EN BODEGA</label><input type="number" name="stock" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-black text-blue-700 outline-none focus:border-blue-500" value={formulario.stock} onChange={manejarCambio} required/></div>
                        
                        <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">MARCA</label><select name="marca_id" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={formulario.marca_id} onChange={manejarCambio}>{marcasLista.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                        <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">CATEGORÍA</label><select name="categoria_id" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={formulario.categoria_id} onChange={manejarCambio}>{categoriasLista.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                        
                        <div className="md:col-span-4"><label className="block text-xs font-black text-slate-500 mb-1">DESCRIPCIÓN TÉCNICA</label><input type="text" name="descripcion" className="w-full bg-slate-50 border-2 border-slate-300 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={formulario.descripcion} onChange={manejarCambio} required/></div>
                        <div className="md:col-span-4"><label className="block text-xs font-black text-slate-500 mb-1">FOTO DEL PRODUCTO {repuestoEditando && '(Opcional)'}</label><input id="inputImagen" type="file" accept="image/*" onChange={(e) => setImagenArchivo(e.target.files[0])} className="w-full text-sm font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-800"/></div>
                    </div>
                    <button type="submit" className={`w-full text-white font-black text-lg py-4 rounded-xl transition shadow-md ${repuestoEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>{repuestoEditando ? 'ACTUALIZAR REPUESTO' : 'GUARDAR NUEVO REPUESTO'}</button>
                </form>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left"><thead className="bg-slate-900 text-white"><tr className="font-black text-xs uppercase tracking-wider"><th className="p-4">Código / Descripción</th><th className="p-4">Marca / Cat</th><th className="p-4">PVP</th><th className="p-4 text-center">Stock</th><th className="p-4 text-right">Controles</th></tr></thead>
                    <tbody className="divide-y-2 divide-slate-100">
                        {inventario.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition">
                                <td className="p-4">
                                    <div className="flex items-center gap-4">
                                        <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className="w-12 h-12 object-contain rounded-lg border-2 border-slate-200 bg-white" />
                                        <div><p className="font-black text-slate-900">{p.codigo_pieza}</p><p className="text-xs font-bold text-slate-500 truncate max-w-[200px]">{p.descripcion}</p></div>
                                    </div>
                                </td>
                                <td className="p-4"><p className="font-black text-slate-700">{p.marca}</p><p className="text-xs font-bold text-slate-500">{p.categoria}</p></td>
                                <td className="p-4 font-black text-emerald-600 text-lg">${p.precio}</td>
                                <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-black ${p.stock > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{p.stock}</span></td>
                                <td className="p-4 flex gap-2 justify-end">
                                    <button onClick={()=>editarRepuesto(p)} className="bg-slate-200 px-3 py-2 rounded-lg font-black text-slate-700 hover:bg-blue-200 transition">Editar</button>
                                    <button onClick={()=>borrarRepuesto(p.id)} className="bg-red-100 px-3 py-2 rounded-lg font-black text-red-600 hover:bg-red-200 transition">Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
            </div>
        </div>
      )}

      {/* PESTAÑA 3: CONFIGURACIÓN (MARCAS Y CATEGORIAS) */}
      {tabActiva === 'CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">🏷️ Directorio de Marcas</h3>
                <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="Ej: ACDelco" className="border-2 border-slate-300 p-3 rounded-xl flex-1 font-bold outline-none focus:border-blue-500" value={nuevaMarca} onChange={e=>setNuevaMarca(e.target.value)}/>
                    <button onClick={()=>{accionSimple('marcas','POST',{nombre:nuevaMarca}); setNuevaMarca('');}} className="bg-slate-900 text-white px-5 rounded-xl font-black hover:bg-slate-800 transition">Añadir</button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {marcasLista.map(m=>(
                        <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                            <span className="font-black text-slate-700">{m.nombre}</span>
                            <button onClick={()=>accionSimple(`marcas/${m.id}`,'DELETE')} className="text-red-500 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-lg font-black transition">X</button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">📂 Categorías Técnicas</h3>
                <div className="flex gap-2 mb-6">
                    <input type="text" placeholder="Ej: Suspensión" className="border-2 border-slate-300 p-3 rounded-xl flex-1 font-bold outline-none focus:border-blue-500" value={nuevaCategoria} onChange={e=>setNuevaCategoria(e.target.value)}/>
                    <button onClick={()=>{accionSimple('categorias','POST',{nombre:nuevaCategoria}); setNuevaCategoria('');}} className="bg-slate-900 text-white px-5 rounded-xl font-black hover:bg-slate-800 transition">Añadir</button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {categoriasLista.map(c=>(
                        <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                            <span className="font-black text-slate-700">{c.nombre}</span>
                            <button onClick={()=>accionSimple(`categorias/${c.id}`,'DELETE')} className="text-red-500 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-lg font-black transition">X</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Admin;