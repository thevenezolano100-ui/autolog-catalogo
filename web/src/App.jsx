import { useEffect, useState } from 'react';
import Admin from './Admin';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com'; 
const WHATSAPP_VENDEDOR = "584120000000"; 

function App() {
  const [productos, setProductos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('Todas');
  const [vista, setVista] = useState('catalogo');
  const [carrito, setCarrito] = useState([]);

  const cargarDatos = async () => {
    try {
      const resProds = await fetch(`${URL_BACKEND}/api/productos`);
      const dataProds = await resProds.json();
      setProductos(dataProds.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i));
      const resMarcas = await fetch(`${URL_BACKEND}/api/marcas`);
      setMarcas(await resMarcas.json());
    } catch (err) { console.error("Error:", err); }
  };
  useEffect(() => { cargarDatos(); }, []);

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
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 p-4 flex justify-between items-center max-w-7xl mx-auto w-full">
        <h1 className="font-black text-xl cursor-pointer" onClick={() => setVista('catalogo')}><span className="text-blue-600">AUTO</span>LOG</h1>
        <button onClick={() => setVista(vista === 'catalogo' ? 'admin' : 'catalogo')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">
            {vista === 'catalogo' ? 'Panel Admin' : 'Volver al Catálogo'}
        </button>
      </nav>

      {vista === 'catalogo' ? (
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex gap-8">
            <div className="flex-1">
                <input type="text" placeholder="Buscar repuesto..." className="w-full p-4 rounded-xl border mb-6" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
                <div className="grid grid-cols-2 gap-6">
                    {filtrados.map(p => (
                        <div key={p.id} className="bg-white p-6 rounded-xl border">
                            <img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className="h-32 mx-auto mb-4 object-contain" />
                            <h2 className="font-bold text-lg">{p.codigo_pieza}</h2>
                            <p className="text-emerald-600 font-black">${p.precio}</p>
                            <p className="text-sm text-slate-500 mb-4">{p.stock > 0 ? `Stock: ${p.stock}` : 'Agotado'}</p>
                            <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg disabled:bg-slate-300">Añadir</button>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="w-80 bg-white p-6 rounded-xl border h-fit sticky top-24 shadow-xl">
                <h3 className="font-bold mb-4">Carrito ({carrito.length})</h3>
                <div className="space-y-4 mb-6">
                    {carrito.map(i => (
                        <div key={i.id} className="bg-slate-50 p-3 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between font-bold text-sm"><span>{i.codigo_pieza}</span> <button onClick={()=>eliminarDelCarrito(i.id)}>x</button></div>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-2 bg-white border p-1 rounded"><button onClick={()=>modificarCantidad(i.id, -1)}>-</button><span className="w-6 text-center">{i.cantidad}</span><button onClick={()=>modificarCantidad(i.id, 1)}>+</button></div>
                                <span>${(i.precio * i.cantidad).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t pt-4 font-black text-xl mb-4">Total: ${calcularTotal()}</div>
                <button onClick={enviarWhatsApp} className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold">Enviar WhatsApp</button>
            </aside>
        </main>
      ) : <Admin />}
    </div>
  );
}
export default App;