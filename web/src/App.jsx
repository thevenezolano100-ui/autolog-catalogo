import { useEffect, useState } from 'react';
import localforage from 'localforage';
import Admin from './Admin';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com'; 
const WHATSAPP_VENDEDOR = "584120000000"; 

function App() {
  const [productos, setProductos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('Todas');
  const [vista, setVista] = useState('catalogo'); // Controla si se ve 'catalogo' o 'admin'
  const [carrito, setCarrito] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // DETECTOR DE CONEXIÓN A INTERNET EN TIEMPO REAL
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cargarDatosMaestros();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // CARGA INTELIGENTE (RED O MEMORIA INTERNA INDEPRENDIENTE DEL WIFI)
  const cargarDatosMaestros = async () => {
    try {
      const resProds = await fetch(`${URL_BACKEND}/api/productos`);
      const dataProds = await resProds.json();
      const filtradosUnicos = dataProds.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setProductos(filtradosUnicos);
      
      const resMarcas = await fetch(`${URL_BACKEND}/api/marcas`);
      const dataMarcas = await resMarcas.json();
      setMarcas(dataMarcas);

      // Si hay internet, actualiza el respaldo en la memoria local
      await localforage.setItem('cache_productos', filtradosUnicos);
      await localforage.setItem('cache_marcas', dataMarcas);
    } catch (err) {
      console.warn("Detectado modo offline. Rescatando base de datos interna...");
      const cacheProds = await localforage.getItem('cache_productos');
      const cacheMarcas = await localforage.getItem('cache_marcas');
      if (cacheProds) setProductos(cacheProds);
      if (cacheMarcas) setMarcas(cacheMarcas);
    }
  };

  // LOGICA DEL CARRITO CON TOPES DE STOCK
  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { 
          alert(`Operación denegada: Solo quedan ${producto.stock} unidades en stock.`); 
          return prev; 
        }
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id, variacion) => {
    setCarrito(prev => prev.map(i => {
      if (i.id === id) {
        const nuevaCant = i.cantidad + variacion;
        return { ...i, cantidad: Math.min(Math.max(1, nuevaCant), i.stock) };
      }
      return i;
    }));
  };

  const eliminarDelCarrito = (id) => setCarrito(prev => prev.filter(i => i.id !== id));
  
  const calcularTotal = () => {
    return carrito.reduce((t, i) => t + (parseFloat(i.precio || 0) * i.cantidad), 0).toFixed(2);
  };

  const enviarWhatsApp = () => {
    let msg = `*SOLICITUD DE COTIZACIÓN - AUTOLOG*\n\n`;
    carrito.forEach((p) => {
      msg += `• *${p.cantidad}x* [${p.codigo_pieza}] - $${p.precio} c/u\n`;
    });
    msg += `\n*TOTAL ESTIMADO: $${calcularTotal()}*`;
    window.open(`https://wa.me/${WHATSAPP_VENDEDOR}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtrados = productos.filter(p => 
    ((p.codigo_pieza || '').toLowerCase().includes(busqueda.toLowerCase()) || 
     (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())) &&
    (filtroMarca === 'Todas' || p.marca === filtroMarca)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* BANNER REACCIONARIO SIN INTERNET */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 text-xs font-black tracking-wider uppercase animate-pulse z-50">
          ⚠️ Modo Offline Activo • Navegando desde la base de datos local
        </div>
      )}

      {/* ENCABEZADO Y PUERTA DE ENTRADA/SALIDA ADMIN */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-black text-xl tracking-tight cursor-pointer" onClick={() => setVista('catalogo')}>
            <span className="text-blue-600">AUTO</span>LOG
          </h1>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setVista(vista === 'catalogo' ? 'admin' : 'catalogo')} 
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${vista === 'admin' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {vista === 'catalogo' ? 'Panel Admin' : '🚪 Salir de Admin'}
            </button>
          </div>
        </div>
      </nav>

      {/* INTERCAMBIADOR DE VISTAS MAESTRO */}
      {vista === 'catalogo' ? (
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col lg:flex-row gap-8">
          
          {/* CATALOGO IZQUIERDO */}
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Buscar por código de pieza o descripción técnica..." 
              className="w-full p-4 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all mb-6" 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
            />
            
            {/* MARCAS BARRA RÁPIDA */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
              <button onClick={() => setFiltroMarca('Todas')} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 ${filtroMarca === 'Todas' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Todas</button>
              {marcas.map(m => (
                <button key={m.id} onClick={() => setFiltroMarca(m.nombre)} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 ${filtroMarca === m.nombre ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>{m.nombre}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtrados.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition">
                  <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className={`h-32 w-full object-contain mb-4 ${p.stock <= 0 ? 'grayscale opacity-40' : ''}`} />
                  <h2 className="font-bold text-slate-800 text-lg leading-tight mb-1">{p.codigo_pieza}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-2">{p.marca || 'Genérico'} • {p.categoria || 'Repuesto'}</p>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{p.descripcion}</p>
                  
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Precio</p>
                      <p className="text-emerald-600 font-black text-xl">${p.precio}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${p.stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {p.stock > 0 ? `${p.stock} Uds` : 'Agotado'}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => agregarAlCarrito(p)} 
                    disabled={p.stock <= 0} 
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 disabled:bg-slate-200 disabled:text-slate-400 transition"
                  >
                    {p.stock > 0 ? 'Agregar al Pedido' : 'Temporalmente Agotado'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TICKET DE COTIZACIÓN DERECHO */}
          <aside className="w-full lg:w-80 bg-white p-6 rounded-2xl border border-slate-200 h-fit lg:sticky top-24 shadow-sm">
            <h3 className="font-black text-slate-800 text-lg mb-4 flex justify-between items-center">
              <span>Tu Pedido</span>
              <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-black">{carrito.length} ítems</span>
            </h3>
            
            <div className="max-h-72 overflow-y-auto space-y-3 mb-6 pr-1 divide-y divide-slate-100">
              {carrito.length === 0 && (
                <p className="text-slate-400 text-sm italic py-4 text-center">No hay repuestos seleccionados.</p>
              )}
              {carrito.map(item => (
                <div key={item.id} className="pt-3 flex flex-col gap-2">
                  <div className="flex justify-between font-bold text-sm text-slate-800">
                    <span className="truncate max-w-[180px]">{item.codigo_pieza}</span>
                    <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-400 font-bold hover:text-red-600 text-xs">Quitar</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center bg-slate-100 border rounded-lg p-0.5">
                      <button onClick={() => modificarCantidad(item.id, -1)} className="px-2 font-bold text-slate-500 hover:text-blue-600">-</button>
                      <span className="w-6 text-center text-xs font-black text-slate-700">{item.cantidad}</span>
                      <button onClick={() => modificarCantidad(item.id, 1)} className="px-2 font-bold text-slate-500 hover:text-blue-600">+</button>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">${(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-200 pt-4 font-black text-lg mb-4 flex justify-between items-center text-slate-800">
              <span>Total Est:</span>
              <span className="text-2xl text-slate-900 tracking-tight">${calcularTotal()}</span>
            </div>
            <button 
              onClick={enviarWhatsApp} 
              disabled={carrito.length === 0} 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold transition shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
            >
              Enviar Pedido por WhatsApp
            </button>
          </aside>
        </main>
      ) : (
        <Admin />
      )}
    </div>
  );
}

export default App;