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

  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: '', categoria_id: '', vehiculos_compatibles: [] });
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

  const contarVentasOffline = async () => { const p = await localforage.getItem('ventas_pendientes') || []; setVentasPendientesOffline(p.length); };

  const cargarTodo = async () => {
    try {
      const [resInv, resCat, resMar] = await Promise.all([ fetch(`${URL_BACKEND}/api/productos`), fetch(`${URL_BACKEND}/api/categorias`), fetch(`${URL_BACKEND}/api/marcas`) ]);
      const dataInv = await resInv.json(); const dataCat = await resCat.json(); const dataMar = await resMar.json();
      setInventario(dataInv); setCategoriasLista(dataCat); setMarcasLista(dataMar);
      await localforage.setItem('cache_productos', dataInv);
      if(!repuestoEditando) setFormulario(prev => ({ ...prev, categoria_id: dataCat[0]?.id || '', marca_id: dataMar[0]?.id || '' }));
    } catch (e) {
      const cache = await localforage.getItem('cache_productos');
      if(cache) setInventario(cache);
    }
  };

  const mostrarAlerta = (texto) => { setMensaje(texto); setTimeout(() => setMensaje(''), 4000); };

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
            if(res.ok) { mostrarAlerta('✅ Venta registrada en la nube.'); setPosCarrito([]); setComprobanteArchivo(null); document.getElementById('inputComp').value=''; cargarTodo(); } 
            else mostrarAlerta('❌ Error del servidor al vender. Revisa la base de datos.');
        } catch (e) { mostrarAlerta('❌ Falla de red.'); }
    } else {
        const vOffline = { ...datosVenta, idOffline: Date.now() };
        const p = await localforage.getItem('ventas_pendientes') || [];
        await localforage.setItem('ventas_pendientes', [...p, vOffline]);
        const invNew = inventario.map(prod => { const v = posCarrito.find(x => x.id === prod.id); return v ? { ...prod, stock: prod.stock - v.cantidad } : prod; });
        setInventario(invNew); await localforage.setItem('cache_productos', invNew);
        setPosCarrito([]); mostrarAlerta('⚠️ Venta guardada LOCALMENTE.'); contarVentasOffline();
    }
  };

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });
  
  const guardarRepuesto = async (e) => {
    e.preventDefault();
    if(!isOnline) return alert("❌ Se requiere internet.");
    const datos = new FormData();
    Object.keys(formulario).forEach(key => { if(key !== 'vehiculos_compatibles') datos.append(key, formulario[key] || ''); });
    datos.append('vehiculos_compatibles', '[]');
    if (imagenArchivo) datos.append('imagen', imagenArchivo);
    try {
      const res = await fetch(repuestoEditando ? `${URL_BACKEND}/api/productos/${formulario.id}` : `${URL_BACKEND}/api/productos`, { method: repuestoEditando ? 'PUT' : 'POST', body: datos });
      if (res.ok) { mostrarAlerta('✅ Repuesto guardado'); cancelarEdicion(); cargarTodo(); }
    } catch (e) { mostrarAlerta('❌ Error al guardar'); }
  };

  const editarRepuesto = (p) => { setFormulario({ id: p.id, codigo_pieza: p.codigo_pieza, descripcion: p.descripcion, marca_id: p.marca_id, categoria_id: p.categoria_id, precio: p.precio, stock: p.stock }); setRepuestoEditando(true); window.scrollTo(0,0); };
  const cancelarEdicion = () => { setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: marcasLista[0]?.id, categoria_id: categoriasLista[0]?.id }); setRepuestoEditando(false); setImagenArchivo(null); };
  const borrarRepuesto = async (id) => { if(window.confirm('¿Borrar?')) { await fetch(`${URL_BACKEND}/api/productos/${id}`, { method: 'DELETE' }); cargarTodo(); } };

  const accionSimple = async (ruta, metodo, cuerpo) => { if(!isOnline) return; await fetch(`${URL_BACKEND}/api/${ruta}`, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(cuerpo) }); cargarTodo(); };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex gap-3 mb-8 border-b-2 pb-4">
        <button onClick={()=>setTabActiva('POS')} className={`font-black px-5 py-3 rounded-xl ${tabActiva === 'POS' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>🛒 POS</button>
        <button onClick={()=>setTabActiva('INVENTARIO')} className={`font-black px-5 py-3 rounded-xl ${tabActiva === 'INVENTARIO' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>📦 Inventario</button>
        <button onClick={()=>setTabActiva('CONFIG')} className={`font-black px-5 py-3 rounded-xl ${tabActiva === 'CONFIG' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>⚙️ Config</button>
      </div>

      {mensaje && <div className="mb-6 p-4 rounded-xl font-black text-sm bg-blue-100 text-blue-800 border-2 border-blue-300 text-center">{mensaje}</div>}

      {tabActiva === 'POS' && (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-white p-6 rounded-2xl border-2">
                <input type="text" placeholder="Código a facturar..." className="w-full p-4 rounded-xl border-2 bg-slate-50 font-bold mb-4" value={posBusqueda} onChange={(e) => setPosBusqueda(e.target.value)} autoFocus />
                {posBusqueda && inventario.filter(p => (p.codigo_pieza||'').toLowerCase().includes(posBusqueda.toLowerCase())).slice(0,5).map(p => (
                    <div key={p.id} onClick={() => posAgregar(p)} className="p-4 border-b-2 cursor-pointer hover:bg-slate-50 flex justify-between">
                        <div><p className="font-black">{p.codigo_pieza}</p><p className="text-sm">Stock: {p.stock}</p></div><p className="font-black text-emerald-600">${p.precio}</p>
                    </div>
                ))}
            </div>
            <aside className="w-full lg:w-[400px] bg-white rounded-2xl border-2 flex flex-col h-[36rem]">
                <div className="bg-slate-900 text-white p-5 rounded-t-xl font-black">🧾 Facturación</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                    {posCarrito.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded-xl border-2 flex justify-between items-center"><p className="font-black text-sm">{item.codigo_pieza} ({item.cantidad})</p><button onClick={()=>posEliminar(item.id)} className="text-red-500 font-black">X</button></div>
                    ))}
                </div>
                <div className="p-5 border-t-2">
                    <select className="w-full bg-slate-100 border-2 p-3 rounded-xl font-black mb-4" value={posMetodoPago} onChange={e=>setPosMetodoPago(e.target.value)}>
                        <option value="Efectivo USD">💵 Efectivo USD</option>
                        <option value="Pago Movil">📱 Pago Móvil</option>
                        <option value="Punto Venta">💳 Punto Venta</option>
                        <option value="Zelle">🇺🇸 Zelle</option>
                    </select>
                    {isOnline && (posMetodoPago === 'Pago Movil' || posMetodoPago === 'Zelle') && (<input id="inputComp" type="file" onChange={e=>setComprobanteArchivo(e.target.files[0])} className="w-full mb-4 text-sm font-bold"/>)}
                    <div className="flex justify-between items-center mb-4"><span className="font-black">TOTAL</span><span className="text-3xl font-black text-slate-900">${posTotal}</span></div>
                    <button onClick={procesarVenta} disabled={posCarrito.length===0} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl disabled:bg-slate-300">💰 FACTURAR</button>
                </div>
            </aside>
        </div>
      )}

      {tabActiva === 'INVENTARIO' && (
        <div className="bg-white p-6 rounded-2xl border-2">
            <h2 className="text-xl font-black mb-4">Añadir Repuesto</h2>
            <form onSubmit={guardarRepuesto} className="flex flex-wrap gap-4 mb-8">
                <input type="text" name="codigo_pieza" placeholder="Código" className="border-2 p-3 rounded-xl font-bold flex-1" value={formulario.codigo_pieza} onChange={manejarCambio} required/>
                <input type="text" name="descripcion" placeholder="Descripción" className="border-2 p-3 rounded-xl font-bold flex-1" value={formulario.descripcion} onChange={manejarCambio} required/>
                <input type="number" step="0.01" name="precio" placeholder="Precio $" className="border-2 p-3 rounded-xl font-black w-32 text-emerald-700" value={formulario.precio} onChange={manejarCambio} required/>
                <input type="number" name="stock" placeholder="Stock" className="border-2 p-3 rounded-xl font-black w-32 text-blue-700" value={formulario.stock} onChange={manejarCambio} required/>
                <button type="submit" className="bg-slate-900 text-white font-black px-6 py-3 rounded-xl">Guardar</button>
            </form>
            <table className="w-full text-left border-2 rounded-xl overflow-hidden"><thead className="bg-slate-900 text-white"><tr className="font-black"><th className="p-4">Código</th><th className="p-4">Precio</th><th className="p-4">Stock</th><th className="p-4"></th></tr></thead>
            <tbody>{inventario.map(p => (<tr key={p.id} className="border-b-2"><td className="p-4 font-black">{p.codigo_pieza}</td><td className="p-4 font-black text-emerald-600">${p.precio}</td><td className="p-4 font-black">{p.stock}</td><td className="p-4 text-right"><button onClick={()=>borrarRepuesto(p.id)} className="text-red-500 font-black">Borrar</button></td></tr>))}</tbody></table>
        </div>
      )}

      {tabActiva === 'CONFIG' && (
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border-2"><h3 className="font-black mb-4">Marcas</h3><div className="flex gap-2"><input type="text" className="border-2 p-2 rounded-xl flex-1 font-bold" value={nuevaMarca} onChange={e=>setNuevaMarca(e.target.value)}/><button onClick={()=>{accionSimple('marcas','POST',{nombre:nuevaMarca}); setNuevaMarca('');}} className="bg-slate-900 text-white px-4 rounded-xl font-black">+</button></div></div>
            <div className="bg-white p-6 rounded-2xl border-2"><h3 className="font-black mb-4">Categorías</h3><div className="flex gap-2"><input type="text" className="border-2 p-2 rounded-xl flex-1 font-bold" value={nuevaCategoria} onChange={e=>setNuevaCategoria(e.target.value)}/><button onClick={()=>{accionSimple('categorias','POST',{nombre:nuevaCategoria}); setNuevaCategoria('');}} className="bg-slate-900 text-white px-4 rounded-xl font-black">+</button></div></div>
        </div>
      )}
    </div>
  );
}
export default Admin;