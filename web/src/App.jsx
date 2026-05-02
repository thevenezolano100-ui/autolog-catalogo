import { useEffect, useState } from 'react';
import Admin from './Admin';
import Login from './Login';
import BuscadorVehiculo from './BuscadorVehiculo';

// ENLACE DE PRODUCCIÓN EN LA NUBE
const URL_BACKEND = 'https://autolog-catalogo.onrender.com'; 
const WHATSAPP_VENDEDOR = "584120000000"; // PON AQUÍ TU NÚMERO

function App() {
  const [productos, setProductos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('Todas');
  const [vista, setVista] = useState('catalogo');
  
  // PERSISTENCIA DE SESIÓN
  const [autenticado, setAutenticado] = useState(() => {
    return localStorage.getItem('auth_autolog') === 'true';
  });
  
  // ESTADO DEL CARRITO B2B (AHORA CON MANEJO DE CANTIDADES)
  const [carrito, setCarrito] = useState([]);

  const cargarDatos = async () => {
    try {
      const resProds = await fetch(`${URL_BACKEND}/api/productos`);
      const dataProds = await resProds.json();
      const unicos = dataProds.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setProductos(unicos);

      const resMarcas = await fetch(`${URL_BACKEND}/api/marcas`);
      setMarcas(await resMarcas.json());
    } catch (err) { console.error("Error de conexión:", err); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const loginExitoso = (usuario) => {
    setAutenticado(true);
    localStorage.setItem('auth_autolog', 'true');
    localStorage.setItem('user_autolog', usuario);
    setVista('admin');
  };

  const cerrarSesion = () => {
    if(window.confirm("¿Deseas cerrar la sesión administrativa?")) {
        setAutenticado(false);
        localStorage.removeItem('auth_autolog');
        localStorage.removeItem('user_autolog');
        setVista('catalogo');
    }
  };

  // ==========================================
  // NUEVO MOTOR DEL CARRITO INTELIGENTE
  // ==========================================
  const agregarAlCarrito = (producto) => {
    setCarrito(prevCarrito => {
      // Verifica si el producto ya existe en el carrito
      const itemExistente = prevCarrito.find(item => item.id === producto.id);
      
      if (itemExistente) {
        // Si existe, le suma 1 a la cantidad
        return prevCarrito.map(item => 
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      } else {
        // Si es nuevo, lo agrega con cantidad 1
        return [...prevCarrito, { ...producto, cantidad: 1 }];
      }
    });
  };

  const modificarCantidad = (idProducto, variacion) => {
    setCarrito(prevCarrito => {
      return prevCarrito.map(item => {
        if (item.id === idProducto) {
          const nuevaCantidad = item.cantidad + variacion;
          // Evita que la cantidad baje de 1. Si quieren 0, usan la "X" para borrarlo.
          return { ...item, cantidad: Math.max(1, nuevaCantidad) };
        }
        return item;
      });
    });
  };

  const eliminarDelCarrito = (idProducto) => {
    setCarrito(prevCarrito => prevCarrito.filter(item => item.id !== idProducto));
  };

  const calcularTotalCarrito = () => {
    return carrito.reduce((total, item) => total + (parseFloat(item.precio || 0) * item.cantidad), 0).toFixed(2);
  };

  const enviarWhatsApp = () => {
    const total = calcularTotalCarrito();
    let mensaje = `Hola, solicito una cotización formal por los siguientes repuestos:\n\n`;
    
    carrito.forEach((p, i) => {
        const subtotal = (parseFloat(p.precio || 0) * p.cantidad).toFixed(2);
        mensaje += `*${p.cantidad}x* [${p.codigo_pieza}] - ${p.marca}\n   Precio: $${p.precio} c/u  (Sub: $${subtotal})\n\n`;
    });
    
    mensaje += `*TOTAL ESTIMADO: $${total}*`;
    
    const url = `https://wa.me/${WHATSAPP_VENDEDOR}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };
  // ==========================================

  // LÓGICA DE FILTRADO
  const filtrados = productos.filter(p => {
    const busqStr = busqueda ? busqueda.toLowerCase() : '';
    const coincideTexto = 
      (p.codigo_pieza && p.codigo_pieza.toLowerCase().includes(busqStr)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(busqStr));
    
    const coincideMarca = (filtroMarca === 'Todas' || p.marca === filtroMarca);
    return coincideTexto && coincideMarca;
  });

  const limpiarTodoElCatalogo = () => {
    setBusqueda('');
    setFiltroMarca('Todas');
    cargarDatos();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 flex flex-col">
      
      {/* BARRA DE NAVEGACIÓN */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-black text-slate-900 tracking-tighter cursor-pointer" onClick={() => { setVista('catalogo'); limpiarTodoElCatalogo(); }}>
            <span className="text-blue-600">AUTO</span>LOG
          </div>
          <div className="flex gap-4 text-sm font-medium items-center">
            <button onClick={() => { setVista('catalogo'); limpiarTodoElCatalogo(); }} className={`px-3 py-2 rounded-lg transition ${vista === 'catalogo' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-blue-600'}`}>Catálogo</button>
            {autenticado ? (
                <div className="flex items-center gap-2">
                    <button onClick={() => setVista('admin')} className={`px-4 py-2 rounded-lg transition shadow-sm ${vista === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Panel Admin</button>
                    <button onClick={cerrarSesion} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Cerrar Sesión">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    </button>
                </div>
            ) : (
                <button onClick={() => setVista('admin')} className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 transition-colors">Acceso Supervisor</button>
            )}
          </div>
        </div>
      </nav>

      {vista === 'catalogo' ? (
        <>
          {/* HEADER DE BÚSQUEDA */}
          <header className="bg-white border-b border-slate-200 py-10">
            <div className="max-w-3xl mx-auto px-6 text-center">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Catálogo B2B de Repuestos</h1>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input 
                  type="text" 
                  placeholder="Buscar por código o descripción técnica..."
                  className="w-full pl-12 pr-14 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-lg shadow-sm"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                    <button onClick={() => setBusqueda('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Limpiar búsqueda">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-6 py-8 gap-8">
            
            {/* SIDEBAR IZQUIERDO: MARCAS */}
            <aside className="w-full lg:w-56 shrink-0">
              <div className="sticky top-24 space-y-8">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Filtrar por Marca</h3>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setFiltroMarca('Todas')} className={`text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${filtroMarca === 'Todas' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Todas las Marcas</button>
                    {marcas.map(m => (
                      <button key={m.id} onClick={() => setFiltroMarca(m.nombre)} className={`text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${filtroMarca === m.nombre ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>{m.nombre}</button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* CONTENIDO PRINCIPAL: GRILLA DE PRODUCTOS */}
            <div className="flex-1">
              <BuscadorVehiculo alEncontrar={(r) => { const unicos = r.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i); setProductos(unicos); }} alLimpiar={cargarDatos} />

              <div className="flex justify-between items-center mb-6 mt-8">
                <h2 className="text-xl font-bold text-slate-800">{filtroMarca === 'Todas' ? 'Todos los Repuestos' : `Repuestos marca ${filtroMarca}`}</h2>
                <span className="text-sm text-slate-500 font-medium">{filtrados.length} resultados</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtrados.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all group flex flex-col">
                    <div className="aspect-square bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
                      <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-4 left-4"><span className="bg-white/80 backdrop-blur-md border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-md text-slate-600 uppercase">{p.categoria || 'Repuesto'}</span></div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold text-slate-900">{p.codigo_pieza}</h2>
                        <span className="text-emerald-600 font-black text-xl">${p.precio}</span>
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-2 mb-4">{p.descripcion}</p>
                      <button onClick={() => agregarAlCarrito(p)} className="mt-auto w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition shadow-sm">
                        Añadir a Cotización
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filtrados.length === 0 && (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 mt-6">
                  <p className="text-slate-400 font-medium mb-4">No hay repuestos compatibles con esta combinación.</p>
                  <button onClick={limpiarTodoElCatalogo} className="bg-slate-900 text-white font-bold px-6 py-2 rounded-xl hover:bg-blue-600 transition-colors">Limpiar Filtros</button>
                </div>
              )}
            </div>

            {/* SIDEBAR DERECHO: EL CARRITO PROFESIONAL */}
            <aside className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-3xl border border-blue-100 shadow-xl p-6 sticky top-24">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                        Tu Cotización 
                        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black">{carrito.length} ítems</span>
                    </h3>
                    
                    <div className="max-h-[22rem] overflow-y-auto mb-6 pr-2 space-y-3">
                        {carrito.length === 0 && (
                            <div className="text-center py-8">
                                <span className="text-4xl">🛒</span>
                                <p className="text-slate-400 text-sm mt-4 font-medium">Tu carrito está vacío.</p>
                            </div>
                        )}
                        
                        {/* LISTA DE ITEMS CON CONTROLES */}
                        {carrito.map((item) => (
                            <div key={item.id} className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-3 relative group">
                                <div className="flex justify-between items-start">
                                    <div className="pr-4">
                                        <p className="font-bold text-sm text-slate-800 leading-tight">{item.codigo_pieza}</p>
                                        <p className="text-xs text-slate-500 font-medium mt-1">${item.precio} c/u</p>
                                    </div>
                                    <button onClick={() => eliminarDelCarrito(item.id)} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full shadow-sm font-bold transition opacity-0 group-hover:opacity-100" title="Quitar producto">×</button>
                                </div>
                                
                                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                                    {/* CONTROLES DE CANTIDAD (+ / -) */}
                                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                                        <button onClick={() => modificarCantidad(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md font-bold transition">-</button>
                                        <span className="text-sm font-black text-slate-800 w-8 text-center">{item.cantidad}</span>
                                        <button onClick={() => modificarCantidad(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md font-bold transition">+</button>
                                    </div>
                                    <span className="font-black text-sm text-emerald-600">${(parseFloat(item.precio || 0) * item.cantidad).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-slate-500 font-bold">Total Estimado:</span>
                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                ${calcularTotalCarrito()}
                            </span>
                        </div>
                        <button 
                            onClick={enviarWhatsApp}
                            disabled={carrito.length === 0}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 transition disabled:bg-slate-200 disabled:text-slate-400 shadow-md disabled:shadow-none"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            Cotizar por WhatsApp
                        </button>
                    </div>
                </div>
            </aside>
          </main>
        </>
      ) : (
        autenticado ? <Admin /> : <Login alEntrar={loginExitoso} />
      )}
    </div>
  );
}

export default App;