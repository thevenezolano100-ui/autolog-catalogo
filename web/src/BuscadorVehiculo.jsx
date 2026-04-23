import { useState, useEffect } from 'react';

function BuscadorVehiculo({ alEncontrar, alLimpiar }) {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [seleccion, setSeleccion] = useState({ marca: '', modelo: '' });

  useEffect(() => {
    fetch('https://autolog-catalogo.onrender.com/api/vehiculos/marcas')
      .then(res => res.json())
      .then(data => setMarcas(data))
      .catch(err => console.error("Error cargando marcas de autos:", err));
  }, []);

  const manejarMarca = (e) => {
    const marca = e.target.value;
    setSeleccion({ marca, modelo: '' });
    
    if (marca) {
        fetch(`https://autolog-catalogo.onrender.com/api/vehiculos/modelos/${marca}`)
        .then(res => res.json())
        .then(data => setModelos(data));
    } else {
        setModelos([]);
    }
  };

  const buscar = () => {
    fetch(`https://autolog-catalogo.onrender.com/api/buscar-por-vehiculo?marca=${seleccion.marca}&modelo=${seleccion.modelo}`)
      .then(res => res.json())
      .then(data => alEncontrar(data));
  };

  // NUEVA FUNCIÓN: Limpiar la cascada
  const limpiar = () => {
    setSeleccion({ marca: '', modelo: '' }); // Vuelve los selects a su valor por defecto
    setModelos([]); // Borra la lista de modelos
    alLimpiar(); // Le avisa a App.jsx que recargue todos los repuestos
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Buscar por Vehículo</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* SELECT DE MARCA (Enlazado al estado para que pueda borrarse) */}
        <select 
          className="p-3 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-500 cursor-pointer"
          value={seleccion.marca}
          onChange={manejarMarca}
        >
          <option value="">Selecciona Marca</option>
          {marcas.map(m => <option key={m.marca_auto} value={m.marca_auto}>{m.marca_auto}</option>)}
        </select>

        {/* SELECT DE MODELO (Enlazado al estado) */}
        <select 
          className="p-3 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-500 cursor-pointer disabled:opacity-50"
          disabled={!seleccion.marca}
          value={seleccion.modelo}
          onChange={(e) => setSeleccion({...seleccion, modelo: e.target.value})}
        >
          <option value="">Selecciona Modelo</option>
          {modelos.map(m => <option key={m.modelo} value={m.modelo}>{m.modelo}</option>)}
        </select>

        <button 
          onClick={buscar}
          disabled={!seleccion.modelo}
          className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-sm"
        >
          Buscar Piezas
        </button>

        {/* NUEVO BOTÓN DE LIMPIAR */}
        <button 
          onClick={limpiar}
          disabled={!seleccion.marca && !seleccion.modelo}
          className="bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 transition-colors"
        >
          Limpiar Búsqueda
        </button>
      </div>
    </div>
  );
}

export default BuscadorVehiculo;