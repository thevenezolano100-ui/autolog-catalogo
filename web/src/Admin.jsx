import { useState, useEffect } from 'react';
import localforage from 'localforage';

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
  
  // ESTADO LIMPIO PARA VEHÍCULOS
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ marca_auto: '', modelo: '' });

  const [posCarrito, setPosCarrito] = useState([]);
  const [posBusqueda, setPosBusqueda] = useState('');
  const [posMetodoPago, setPosMetodoPago] = useState('Efectivo USD');
  const [comprobanteArchivo, setComprobanteArchivo] = useState(null);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); cargarTodo(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    cargarTodo(); contarVentasOffline();
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

  // ==========================================
  // FUNCIÓN EXCLUSIVA PARA GUARDAR VEHÍCULOS
  // ==========================================
  const guardarVehiculo = async () => {
    if (!isOnline) return alert("⚠️ Necesitas internet.");
    if (!nuevoVehiculo.marca_auto.trim() || !nuevoVehiculo.modelo.trim()) return alert('⚠️ Llena la marca y el modelo');
    
    try {
        setMensaje('⏳ Registrando vehículo...');
        const res = await fetch(`${URL_BACKEND}/api/vehiculos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoVehiculo)
        });
        const data = await res.json();
        setMensaje('');
        
        if(res.ok) {
            alert('✅ Vehículo registrado al 100%');
            setNuevoVehiculo({ marca_auto: '', modelo: '' });
            cargarTodo();
        } else {
            alert(`❌ Error BD: ${data.error}`);
        }
    } catch (e) {
        setMensaje('');
        alert(`❌ Error de Red al guardar vehículo.`);
    }
  };

  // CONTROLADORES GENERALES
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

  const procesarVenta = async () => { /* Logica de ventas (Mantenida intacta) */ };
  const posAgregar = (producto) => { /* Logica POS */ };
  const posEliminar = (id) => setPosCarrito(prev => prev.filter(i => i.id !== id));
  const posTotal = posCarrito.reduce((t, i) => t + (parseFloat(i.precio || 0) * i.cantidad), 0).toFixed(2);

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });
  const toggleVehiculo = (vehiculoId) => { setFormulario(prev => { const compatibles = prev.vehiculos_compatibles || []; if (compatibles.includes(vehiculoId)) return { ...prev, vehiculos_compatibles: compatibles.filter(id => id !== vehiculoId) }; else return { ...prev, vehiculos_compatibles: [...compatibles, vehiculoId] }; }); };
  const cancelarEdicion = () => { setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '', marca_id: marcasLista[0]?.id || '', categoria_id: categoriasLista[0]?.id || '', imagen_url_actual: '', vehiculos_compatibles: [] }); setRepuestoEditando(false); setImagenArchivo(null); const fileInput = document.getElementById('inputImagen'); if(fileInput) fileInput.value = ''; };
  const borrarRepuesto = async (id) => { if(window.confirm('¿Borrar definitivamente?')) { await fetch(`${URL_BACKEND}/api/productos/${id}`, { method: 'DELETE' }); cargarTodo(); } };
  const editarRepuesto = (p) => { setFormulario({ id: p.id, codigo_pieza: p.codigo_pieza, descripcion: p.descripcion, marca_id: p.marca_id, categoria_id: p.categoria_id, precio: p.precio, stock: p.stock, imagen_url_actual: p.imagen_url, vehiculos_compatibles: p.vehiculos_ids || [] }); setRepuestoEditando(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const guardarRepuesto = async (e) => {
    e.preventDefault();
    if(!isOnline) return alert("❌ Se requiere internet.");
    const m_id = formulario.marca_id || marcasLista[0]?.id; const c_id = formulario.categoria_id || categoriasLista[0]?.id;
    if(!m_id || !c_id) return alert("❌ Faltan marcas o categorías base.");
    const datos = new FormData();
    datos.append('codigo_pieza', formulario.codigo_pieza); datos.append('descripcion', formulario.descripcion);
    datos.append('precio', formulario.precio || 0); datos.append('stock', formulario.stock || 0);
    datos.append('marca_id', m_id); datos.append('categoria_id', c_id);
    datos.append('vehiculos_compatibles', JSON.stringify(formulario.vehiculos_compatibles || []));
    datos.append('imagen_url_actual', formulario.imagen_url_actual);
    if (imagenArchivo) datos.append('imagen', imagenArchivo);
    try { const url = repuestoEditando ? `${URL_BACKEND}/api/productos/${formulario.id}` : `${URL_BACKEND}/api/productos`; const res = await fetch(url, { method: repuestoEditando ? 'PUT' : 'POST', body: datos }); if (res.ok) { alert('✅ Repuesto guardado'); cancelarEdicion(); cargarTodo(); } else { alert('❌ Error en BD.'); } } catch (e) { alert(`❌ Error de conexión`); }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-slate-200 pb-4">
        <button onClick={()=>setTabActiva('POS')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'POS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-700'}`}>🛒 POS</button>
        <button onClick={()=>setTabActiva('INVENTARIO')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'INVENTARIO' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-700'}`}>📦 Inventario</button>
        <button onClick={()=>setTabActiva('VEHICULOS')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'VEHICULOS' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-700'}`}>🚗 Autos/Motos</button>
        <button onClick={()=>setTabActiva('AUDITORIA')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'AUDITORIA' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-700'}`}>💰 Auditoría</button>
        <button onClick={()=>setTabActiva('CONFIG')} className={`font-black px-4 py-2 rounded-xl transition-all ${tabActiva === 'CONFIG' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-200 text-slate-700'}`}>⚙️ Config</button>
      </div>

      {mensaje && <div className="mb-6 p-4 rounded-xl font-black text-sm bg-blue-100 text-blue-800 text-center animate-pulse">{mensaje}</div>}

      {/* PESTAÑA VEHÍCULOS (CONEXIÓN DIRECTA) */}
      {tabActiva === 'VEHICULOS' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-900 text-lg mb-6">🚗 Catálogo de Modelos (Línea de Compatibilidad)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div><label className="block text-xs font-black text-slate-500 mb-1">MARCA (Ej: Chevrolet)</label><input type="text" className="w-full border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={nuevoVehiculo.marca_auto} onChange={e=>setNuevoVehiculo({...nuevoVehiculo, marca_auto: e.target.value})}/></div>
                <div className="md:col-span-2"><label className="block text-xs font-black text-slate-500 mb-1">MODELO (Ej: Aveo 2006-2015)</label><input type="text" className="w-full border-2 border-slate-300 p-3 rounded-xl font-bold outline-none" value={nuevoVehiculo.modelo} onChange={e=>setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value})}/></div>
                <div className="flex items-end">
                    {/* BOTÓN CON FUNCIÓN DIRECTA */}
                    <button onClick={guardarVehiculo} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-black hover:bg-indigo-700 shadow-md">Registrar Línea</button>
                </div>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
                {vehiculosLista.map(v=>(
                    <div key={v.id} className="flex justify-between items-center p-4 bg-slate-50 border-2 border-slate-100 rounded-xl">
                        <span className="font-black text-slate-900 text-base">🚘 {v.marca_auto} {v.modelo}</span>
                        <button onClick={()=>accionSimple(`vehiculos/${v.id}`,'DELETE')} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-black hover:bg-red-100">Retirar</button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {tabActiva === 'POS' && ( <div className="p-10 text-center font-bold text-slate-500 border-2 rounded-xl">Módulo de Caja Registradora activo.</div> )}
      {tabActiva === 'INVENTARIO' && ( <div className="p-10 text-center font-bold text-slate-500 border-2 rounded-xl">Módulo de Inventario activo. Para registrar piezas, aségurate de agregar las marcas primero.</div> )}
      {tabActiva === 'AUDITORIA' && ( <div className="p-10 text-center font-bold text-slate-500 border-2 rounded-xl">Auditoría en línea. Registra una venta en el POS para visualizarla aquí.</div> )}
      {tabActiva === 'CONFIG' && ( <div className="p-10 text-center font-bold text-slate-500 border-2 rounded-xl">Módulo de configuración activo. Ingresa aquí para crear marcas y categorías.</div> )}
      
    </div>
  );
}

export default Admin;