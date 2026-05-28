import { useEffect, useState } from 'react';
import localforage from 'localforage';
import Admin from './Admin';
// import BuscadorVehiculo from './BuscadorVehiculo'; // Descomenta si tienes tu buscador

const URL_BACKEND = 'https://autolog-catalogo.onrender.com'; 
const WHATSAPP_VENDEDOR = "584263266172"; 

function App() {
  const [productos, setProductos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('Todas');
  const [vista, setVista] = useState('catalogo');
  const [carrito, setCarrito] = useState([]);
  
  // ESTADO DE RED (OFFLINE / ONLINE)
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Escuchadores para detectar si se cae el internet
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    cargarDatos();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cargarDatos = async () => {
    try {
      // 1. Intenta conectarse a la nube
      const resProds = await fetch(`${URL_BACKEND}/api/productos`);
      const dataProds = await resProds.json();
      const unicos = dataProds.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setProductos(unicos);
      
      const resMarcas = await fetch(`${URL_BACKEND}/api/marcas`);
      const dataMarcas = await resMarcas.json();
      setMarcas(dataMarcas);

      // 2. Si hay internet, guarda una copia de seguridad en el celular/PC
      await localforage.setItem('cache_productos', unicos);
      await localforage.setItem('cache_marcas', dataMarcas);

    } catch (err) { 
      // 3. ¡SE FUE EL INTERNET! Rescata los datos de la memoria interna
      console.warn("Sin conexión. Cargando catálogo desde la memoria caché...");
      const cacheProds = await localforage.getItem('cache_productos');
      const cacheMarcas = await localforage.getItem('cache_marcas');
      
      if (cacheProds) setProductos(cacheProds);
      if (cacheMarcas) setMarcas(cacheMarcas);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) { alert(`Solo quedan ${producto.stock} en stock`); return prev; }
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id, variacion) => {
    setCarrito(prev => prev.map(i => {
        if (i.id === id) return { ...i, cantidad: Math.min(Math.max(1, i.cantidad + variacion), i.stock) };
        return i;
    }));
  };

  const eliminarDelCarrito = (id) => setCarrito(prev => prev.filter(i => i.id !== id));
  const calcularTotal = () => carrito.reduce((t, i) => t + (parseFloat(i.precio || 0) * i.cantidad), 0).toFixed(2);

  const enviarWhatsApp = () => {
    let msg = `Hola, solicito cotización:\n\n`;
    carrito.forEach((p) => { msg += `*${p.cantidad}x* [${p.codigo_pieza}] - $${p.precio} c/u\n`; });
    msg += `\n*TOTAL: $${calcularTotal()}*`;
    window.open(`https://wa.me/${WHATSAPP_VENDEDOR}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtrados = productos.filter(p => 
    ((p.codigo_pieza || '').toLowerCase().includes(busqueda.toLowerCase()) || (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())) &&
    (filtroMarca === 'Todas' || p.marca === filtroMarca)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* ALERTA DE SIN CONEXIÓN */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-1 text-sm font-bold flex justify-center items-center gap-2">
          <span>⚠️</span> Estás operando sin conexión a internet. El catálogo local está activo.
        </div>
      )}

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 p-4 flex justify-between items-center max-w-7xl mx-auto w-full">
        <h1 className="font-black text-xl cursor-pointer" onClick={() => setVista('catalogo')}><span className="text-blue-600">AUTO</span>LOG</h1>
        <button onClick={() => setVista(vista === 'catalogo' ? 'admin' : 'catalogo')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">
            {vista === 'catalogo' ? 'Panel Admin' : 'Volver al Catálogo'}
        </button>
      </nav>

      {vista === 'catalogo' ? (
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
                <input type="text" placeholder="Buscar repuesto..." className="w-full p-4 rounded-xl border mb-6 outline-none focus:ring-2 focus:ring-blue-500" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {filtrados.map(p => (
                        <div key={p.id} className="bg-white p-6 rounded-xl border hover:shadow-lg transition flex flex-col">
                            <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className={`h-32 w-full object-contain mb-4 ${p.stock <= 0 ? 'grayscale opacity-50' : ''}`} />
                            <h2 className="font-bold text-lg">{p.codigo_pieza}</h2>
                            <p className="text-emerald-600 font-black text-xl">${p.precio}</p>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.descripcion}</p>
                            <p className={`text-xs font-bold mb-4 ${p.stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>{p.stock > 0 ? `Bodega: ${p.stock} uds` : 'Agotado'}</p>
                            <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} className="mt-auto w-full bg-slate-900 text-white font-bold py-3 rounded-lg disabled:bg-slate-300">Añadir a lista</button>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="w-full lg:w-80 bg-white p-6 rounded-xl border h-fit lg:sticky top-24 shadow-xl">
                <h3 className="font-bold mb-4">Cotización ({carrito.length})</h3>
                <div className="max-h-80 overflow-y-auto space-y-4 mb-6 pr-2">
                    {carrito.map(i => (
                        <div key={i.id} className="bg-slate-50 p-3 rounded-lg flex flex-col gap-2 border border-slate-100">
                            <div className="flex justify-between font-bold text-sm"><span>{i.codigo_pieza}</span> <button onClick={()=>eliminarDelCarrito(i.id)} className="text-red-400">x</button></div>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2 bg-white border p-1 rounded items-center"><button onClick={()=>modificarCantidad(i.id, -1)} className="px-2 font-bold text-slate-500">-</button><span className="w-4 text-center text-sm font-black">{i.cantidad}</span><button onClick={()=>modificarCantidad(i.id, 1)} className="px-2 font-bold text-slate-500">+</button></div>
                                <span className="font-black text-emerald-600">${(i.precio * i.cantidad).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t pt-4 font-black text-xl mb-4 flex justify-between"><span>Total:</span> <span>${calcularTotal()}</span></div>
                <button onClick={enviarWhatsApp} disabled={carrito.length === 0} className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold disabled:bg-slate-200">Enviar WhatsApp</button>
            </aside>
        </main>
      ) : <Admin />}
    </div>
  );
}
export default App;