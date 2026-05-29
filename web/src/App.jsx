import { useEffect, useState } from 'react';
import localforage from 'localforage';
import Admin from './Admin';
import Login from './Login';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com'; 
const WHATSAPP_VENDEDOR = "584120000000"; 

function App() {
  const [productos, setProductos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('Todas');
  const [vista, setVista] = useState('catalogo');
  const [carrito, setCarrito] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [autenticado, setAutenticado] = useState(() => localStorage.getItem('auth_autolog') === 'true');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true); const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    cargarDatosMaestros();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const cargarDatosMaestros = async () => {
    try {
      const resProds = await fetch(`${URL_BACKEND}/api/productos`); const dataProds = await resProds.json();
      const filtradosUnicos = dataProds.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setProductos(filtradosUnicos);
      const resMarcas = await fetch(`${URL_BACKEND}/api/marcas`); const dataMarcas = await resMarcas.json(); setMarcas(dataMarcas);
      await localforage.setItem('cache_productos', filtradosUnicos); await localforage.setItem('cache_marcas', dataMarcas);
    } catch (err) {
      const cacheProds = await localforage.getItem('cache_productos'); const cacheMarcas = await localforage.getItem('cache_marcas');
      if (cacheProds) setProductos(cacheProds); if (cacheMarcas) setMarcas(cacheMarcas);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) { if (existe.cantidad >= producto.stock) { alert(`Solo quedan ${producto.stock} uds.`); return prev; } return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i); }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id, variacion) => { setCarrito(prev => prev.map(i => { if (i.id === id) return { ...i, cantidad: Math.min(Math.max(1, i.cantidad + variacion), i.stock) }; return i; })); };
  const eliminarDelCarrito = (id) => setCarrito(prev => prev.filter(i => i.id !== id));
  const calcularTotal = () => carrito.reduce((t, i) => t + (parseFloat(i.precio || 0) * i.cantidad), 0).toFixed(2);

  const enviarWhatsApp = () => {
    let msg = `*NUEVO PEDIDO*\n\n`;
    carrito.forEach((p) => { msg += `• *${p.cantidad}x* [${p.codigo_pieza}] - $${p.precio} c/u\n`; });
    msg += `\n*TOTAL: $${calcularTotal()}*`;
    window.open(`https://wa.me/${WHATSAPP_VENDEDOR}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // BUSCADOR INTELIGENTE: Busca en Código, Descripción y Vehículos Compatibles
  const filtrados = productos.filter(p => {
    const textoBuscado = busqueda.toLowerCase();
    const coincideTexto = (p.codigo_pieza || '').toLowerCase().includes(textoBuscado) || 
                          (p.descripcion || '').toLowerCase().includes(textoBuscado) ||
                          (p.vehiculos_nombres || '').toLowerCase().includes(textoBuscado); // <- Filtro por vehículo
    const coincideMarca = filtroMarca === 'Todas' || p.marca === filtroMarca;
    return coincideTexto && coincideMarca;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {!isOnline && (<div className="bg-red-600 text-white text-center py-2 text-xs font-black tracking-wider uppercase z-50">⚠️ Modo Offline Activo</div>)}

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-black text-xl tracking-tight cursor-pointer" onClick={() => setVista('catalogo')}><span className="text-blue-600">AUTO</span>LOG</h1>
          <div className="flex gap-4 items-center">
            {vista === 'admin' && autenticado && ( <button onClick={() => { setAutenticado(false); localStorage.removeItem('auth_autolog'); setVista('catalogo'); }} className="text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition">Cerrar Sesión</button> )}
            <button onClick={() => setVista(vista === 'catalogo' ? 'admin' : 'catalogo')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${vista === 'admin' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {vista === 'catalogo' ? 'Acceso Supervisor' : 'Volver al Catálogo'}
            </button>
          </div>
        </div>
      </nav>

      {vista === 'catalogo' ? (
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <input type="text" placeholder="Buscar por código, repuesto o carro (Ej: Aveo)..." className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white shadow-sm outline-none focus:border-indigo-500 mb-6 font-bold text-lg" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
              <button onClick={() => setFiltroMarca('Todas')} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 ${filtroMarca === 'Todas' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Todas</button>
              {marcas.map(m => (<button key={m.id} onClick={() => setFiltroMarca(m.nombre)} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 ${filtroMarca === m.nombre ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>{m.nombre}</button>))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtrados.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col hover:border-indigo-300 transition">
                  <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className={`h-32 w-full object-contain mb-4 ${p.stock <= 0 ? 'grayscale opacity-40' : ''}`} />
                  <h2 className="font-black text-slate-900 text-lg">{p.codigo_pieza}</h2>
                  <p className="text-sm font-bold text-slate-500 mb-2">{p.descripcion}</p>
                  {p.vehiculos_nombres && <p className="text-xs font-bold text-indigo-600 bg-indigo-50 p-2 rounded-lg mb-2">🚗 Sirve para: {p.vehiculos_nombres}</p>}
                  <div className="flex justify-between items-center mt-auto pt-4">
                    <p className="text-emerald-600 font-black text-2xl">${p.precio}</p>
                    <p className={`text-sm font-black ${p.stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>{p.stock > 0 ? `Stock: ${p.stock}` : 'Agotado'}</p>
                  </div>
                  <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} className="w-full bg-slate-900 text-white font-black py-3 rounded-xl mt-4 disabled:bg-slate-300 transition">Añadir al Pedido</button>
                </div>
              ))}
            </div>
          </div>
          <aside className="w-full lg:w-80 bg-white p-6 rounded-2xl border-2 border-slate-200 h-fit lg:sticky top-24 shadow-sm">
            <h3 className="font-black text-slate-900 text-lg mb-4">Cotización ({carrito.length})</h3>
            <div className="max-h-72 overflow-y-auto space-y-3 mb-6 pr-1">
              {carrito.map(item => (
                <div key={item.id} className="bg-slate-50 p-3 border-2 border-slate-100 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between font-black text-sm text-slate-800"><span>{item.codigo_pieza}</span><button onClick={() => eliminarDelCarrito(item.id)} className="text-red-400">X</button></div>
                  <div className="flex justify-between items-center"><div className="flex bg-white border-2 rounded-lg"><button onClick={() => modificarCantidad(item.id, -1)} className="px-2 font-bold">-</button><span className="w-6 text-center text-sm font-black text-slate-700">{item.cantidad}</span><button onClick={() => modificarCantidad(item.id, 1)} className="px-2 font-bold">+</button></div><span className="font-black text-emerald-600">${(item.precio * item.cantidad).toFixed(2)}</span></div>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-slate-200 pt-4 font-black text-lg mb-4 flex justify-between"><span>Total:</span><span className="text-3xl">${calcularTotal()}</span></div>
            <button onClick={enviarWhatsApp} disabled={carrito.length === 0} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black disabled:bg-slate-300">Enviar WhatsApp</button>
          </aside>
        </main>
      ) : (
        autenticado ? <Admin /> : <Login alEntrar={(u) => { setAutenticado(true); localStorage.setItem('auth_autolog', 'true'); }} />
      )}
    </div>
  );
}
export default App;