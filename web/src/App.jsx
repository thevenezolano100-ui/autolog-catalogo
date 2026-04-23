import { useEffect, useState } from 'react';
import Admin from './Admin';
import Login from './Login';
import BuscadorVehiculo from './BuscadorVehiculo';

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

  const cargarDatos = async () => {
    try {
      const resProds = await fetch('http://127.0.0.1:3000/api/productos');
      const dataProds = await resProds.json();
      const unicos = dataProds.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      setProductos(unicos);

      const resMarcas = await fetch('http://127.0.0.1:3000/api/marcas');
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

  // LÓGICA DE FILTRADO (Texto + Barra Lateral)
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
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
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
          <header className="bg-white border-b border-slate-200 py-12">
            <div className="max-w-3xl mx-auto px-6 text-center">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Catálogo Maestro de Repuestos</h1>
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

          <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
            
            {/* SIDEBAR DE MARCAS */}
            <aside className="w-full lg:w-64 shrink-0">
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

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1">
              <BuscadorVehiculo alEncontrar={(r) => { const unicos = r.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i); setProductos(unicos); }} alLimpiar={cargarDatos} />

              <div className="flex justify-between items-center mb-6 mt-8">
                <h2 className="text-xl font-bold text-slate-800">{filtroMarca === 'Todas' ? 'Todos los Repuestos' : `Repuestos marca ${filtroMarca}`}</h2>
                <span className="text-sm text-slate-500 font-medium">{filtrados.length} resultados</span>
              </div>

              {/* GRILLA DE RESULTADOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filtrados.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all group flex flex-col">
                    <div className="aspect-square bg-slate-50 flex items-center justify-center p-12 relative overflow-hidden">
                      <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-4 left-4"><span className="bg-white/80 backdrop-blur-md border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-md text-slate-600 uppercase">{p.categoria || 'Repuesto'}</span></div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-xl font-bold text-slate-900">{p.codigo_pieza}</h2>
                        <span className="text-blue-600 text-[10px] font-black uppercase px-2 py-1 bg-blue-50 rounded italic">{p.marca}</span>
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-2 mt-auto">{p.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>

              {filtrados.length === 0 && (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300">
                  <p className="text-slate-400 font-medium mb-4">No hay repuestos compatibles con esta combinación.</p>
                  <button onClick={limpiarTodoElCatalogo} className="bg-slate-900 text-white font-bold px-6 py-2 rounded-xl hover:bg-blue-600 transition-colors">Limpiar Filtros</button>
                </div>
              )}
            </div>
          </main>
        </>
      ) : (
        autenticado ? <Admin /> : <Login alEntrar={loginExitoso} />
      )}
    </div>
  );
}

export default App;