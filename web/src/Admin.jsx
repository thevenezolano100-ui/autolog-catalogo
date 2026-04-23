import { useState, useEffect } from 'react';

function Admin() {
  // ESTADOS DEL REPUESTO
  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', marca_id: '', categoria_id: '', imagen_url_actual: '', vehiculos_compatibles: [] });
  const [repuestoEditando, setRepuestoEditando] = useState(false);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [mensaje, setMensaje] = useState('');

  // ESTADOS DE LISTAS
  const [categoriasLista, setCategoriasLista] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [inventario, setInventario] = useState([]);

  // CRUD DE MARCAS
  const [marcasLista, setMarcasLista] = useState([]);
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [marcaEditando, setMarcaEditando] = useState(null); 

  // CRUD DE VEHICULOS
  const [vehiculosLista, setVehiculosLista] = useState([]);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ marca_auto: '', modelo: '', anio_inicio: '', anio_fin: '', motor: '' });

  // ESTADO DEL PERFIL (SUPERVISOR) CORREGIDO
  const [perfil, setPerfil] = useState({ id: '', nombre_usuario: '', contrasena: '' });
  const [editandoPerfil, setEditandoPerfil] = useState(false);

  useEffect(() => { 
    cargarDatosBasicos(); 
    cargarDatosPerfil();
  }, []);

  const cargarDatosBasicos = async () => {
    try {
      const resCat = await fetch('https://autolog-catalogo.onrender.com/api/categorias'); setCategoriasLista(await resCat.json());
      const resMar = await fetch('https://autolog-catalogo.onrender.com/api/marcas'); setMarcasLista(await resMar.json());
      const resVeh = await fetch('https://autolog-catalogo.onrender.com/api/vehiculos'); setVehiculosLista(await resVeh.json());
      const resInv = await fetch('https://autolog-catalogo.onrender.com/api/productos'); setInventario(await resInv.json());

      if(!repuestoEditando && formulario.categoria_id === '') {
        setFormulario(prev => ({ ...prev, categoria_id: categoriasLista[0]?.id || '', marca_id: marcasLista[0]?.id || '' }));
      }
    } catch (error) { console.error(error); }
  };

  // FUNCIÓN CORREGIDA: Ya no depende del Login.jsx
  const cargarDatosPerfil = async () => {
    try {
        const res = await fetch('https://autolog-catalogo.onrender.com/api/usuario-admin');
        const data = await res.json();
        if(data) {
            setPerfil({ id: data.id, nombre_usuario: data.nombre_usuario, contrasena: '' });
        }
    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
  };

  // --- FUNCIONES DEL REPUESTO ---
  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });
  const manejarCheckboxVehiculo = (idVehiculo) => {
    setFormulario(prev => {
        const compatibles = prev.vehiculos_compatibles || [];
        if (compatibles.includes(idVehiculo)) return { ...prev, vehiculos_compatibles: compatibles.filter(id => id !== idVehiculo) };
        else return { ...prev, vehiculos_compatibles: [...compatibles, idVehiculo] };
    });
  };

  const guardarRepuesto = async (e) => {
    e.preventDefault();
    const datos = new FormData();
    datos.append('codigo_pieza', formulario.codigo_pieza);
    datos.append('marca_id', formulario.marca_id);
    datos.append('categoria_id', formulario.categoria_id);
    datos.append('descripcion', formulario.descripcion);
    datos.append('imagen_url_actual', formulario.imagen_url_actual);
    datos.append('vehiculos_compatibles', JSON.stringify(formulario.vehiculos_compatibles));
    if (imagenArchivo) datos.append('imagen', imagenArchivo);

    const url = repuestoEditando ? `https://autolog-catalogo.onrender.com/api/productos/${formulario.id}` : 'https://autolog-catalogo.onrender.com/api/productos';
    const metodo = repuestoEditando ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method: metodo, body: datos });
      if (res.ok) {
        setMensaje(repuestoEditando ? '✅ ¡Repuesto actualizado!' : '✅ ¡Repuesto creado!');
        cancelarEdicion();
        cargarDatosBasicos();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (error) { setMensaje('❌ Error de conexión'); }
  };

  const iniciarEdicionRepuesto = (p) => {
    setFormulario({ id: p.id, codigo_pieza: p.codigo_pieza, descripcion: p.descripcion, marca_id: p.marca_id, categoria_id: p.categoria_id, imagen_url_actual: p.imagen_url, vehiculos_compatibles: p.vehiculos_compatibles || [] });
    setRepuestoEditando(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setFormulario({ id: null, codigo_pieza: '', descripcion: '', marca_id: marcasLista[0]?.id, categoria_id: categoriasLista[0]?.id, imagen_url_actual: '', vehiculos_compatibles: [] });
    setRepuestoEditando(false); setImagenArchivo(null); document.getElementById('inputImagen').value = '';
  };
  const eliminarRepuesto = async (id, codigo) => { if (window.confirm(`¿Borrar repuesto ${codigo}?`)) { await fetch(`https://autolog-catalogo.onrender.com/api/productos/${id}`, { method: 'DELETE' }); cargarDatosBasicos(); } };

  // --- FUNCIONES DE MARCAS ---
  const guardarMarca = async (e) => {
    e.preventDefault();
    if (marcaEditando) await fetch(`https://autolog-catalogo.onrender.com/api/marcas/${marcaEditando}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevaMarca }) });
    else await fetch('https://autolog-catalogo.onrender.com/api/marcas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevaMarca }) });
    setNuevaMarca(''); setMarcaEditando(null); cargarDatosBasicos();
  };
  const eliminarMarca = async (id, nombre) => {
    if (window.confirm(`⚠️ ¿Borrar la marca ${nombre}?`)) {
        const res = await fetch(`https://autolog-catalogo.onrender.com/api/marcas/${id}`, { method: 'DELETE' });
        if (!res.ok) alert((await res.json()).error || 'Error al borrar'); else cargarDatosBasicos();
    }
  };

  // --- FUNCIONES DE VEHICULOS Y CATEGORIAS ---
  const manejarCambioVehiculo = (e) => setNuevoVehiculo({ ...nuevoVehiculo, [e.target.name]: e.target.value });
  const guardarVehiculo = async (e) => {
    e.preventDefault();
    const url = vehiculoEditando ? `https://autolog-catalogo.onrender.com/api/vehiculos/${vehiculoEditando}` : 'https://autolog-catalogo.onrender.com/api/vehiculos';
    const metodo = vehiculoEditando ? 'PUT' : 'POST';
    await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoVehiculo) });
    setNuevoVehiculo({ marca_auto: '', modelo: '', anio_inicio: '', anio_fin: '', motor: '' }); setVehiculoEditando(null); cargarDatosBasicos();
  };
  const eliminarVehiculo = async (id, nombre) => { if (window.confirm(`¿Borrar el vehículo ${nombre}?`)) { await fetch(`https://autolog-catalogo.onrender.com/api/vehiculos/${id}`, { method: 'DELETE' }); cargarDatosBasicos(); } };
  const guardarNuevaCategoria = async (e) => { e.preventDefault(); await fetch('https://autolog-catalogo.onrender.com/api/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevaCategoria }) }); setNuevaCategoria(''); cargarDatosBasicos(); };

  // --- FUNCIONES DEL PERFIL ---
  const guardarPerfil = async (e) => {
    e.preventDefault();
    if(!perfil.id) return alert("Cargando credenciales, por favor intenta de nuevo en un segundo.");
    
    const res = await fetch(`https://autolog-catalogo.onrender.com/api/usuario/${perfil.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevo_nombre: perfil.nombre_usuario, nueva_contrasena: perfil.contrasena })
    });
    
    if (res.ok) {
        alert("Credenciales actualizadas correctamente. Inicia sesión nuevamente.");
        localStorage.removeItem('auth_autolog');
        localStorage.removeItem('user_autolog');
        window.location.reload();
    } else {
        alert("Hubo un error al actualizar el perfil.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      
      {/* 1. FORMULARIO PRINCIPAL DE REPUESTOS */}
      <div className={`bg-white rounded-2xl shadow-sm border p-8 transition-colors ${repuestoEditando ? 'border-orange-200 ring-4 ring-orange-50' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800">{repuestoEditando ? '✏️ Editando Repuesto' : '1. Ingreso de Repuestos'}</h2>
            {repuestoEditando && <button onClick={cancelarEdicion} className="text-sm font-bold text-red-500 hover:underline">Cancelar Edición</button>}
        </div>
        {mensaje && <div className="p-4 rounded-xl mb-6 font-bold text-sm bg-blue-50 text-blue-700 border border-blue-100">{mensaje}</div>}
        <form onSubmit={guardarRepuesto} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Código</label><input type="text" name="codigo_pieza" required className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={formulario.codigo_pieza} onChange={manejarCambio}/></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Imagen {repuestoEditando && '(Opcional)'}</label><input id="inputImagen" type="file" onChange={(e) => setImagenArchivo(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 font-bold cursor-pointer"/></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Marca</label><select name="marca_id" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200" value={formulario.marca_id} onChange={manejarCambio}>{marcasLista.map(mar => <option key={mar.id} value={mar.id}>{mar.nombre}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Categoría</label><select name="categoria_id" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200" value={formulario.categoria_id} onChange={manejarCambio}>{categoriasLista.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}</select></div>
            
            <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Vehículos Compatibles</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                    {vehiculosLista.length === 0 && <span className="text-slate-400 text-sm">No hay vehículos.</span>}
                    {vehiculosLista.map(v => (
                        <label key={v.id} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded transition">
                            <input type="checkbox" className="mt-1 accent-blue-600" checked={formulario.vehiculos_compatibles?.includes(v.id) || false} onChange={() => manejarCheckboxVehiculo(v.id)} />
                            <span className="leading-tight font-medium text-slate-700">{v.marca_auto} {v.modelo} <br/><span className="text-xs text-slate-400">({v.anio_inicio}-{v.anio_fin || 'Presente'})</span></span>
                        </label>
                    ))}
                </div>
            </div>
          </div>
          <div><label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label><textarea name="descripcion" required rows="2" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none resize-none" value={formulario.descripcion} onChange={manejarCambio}></textarea></div>
          <button type="submit" className={`w-full py-4 rounded-xl text-white font-bold shadow-md transition-all ${repuestoEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{repuestoEditando ? 'Actualizar Repuesto' : 'Guardar Nuevo Repuesto'}</button>
        </form>
      </div>

      {/* 2. CONFIGURACIÓN DE MARCAS Y CATEGORÍAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">{marcaEditando ? '✏️ Editando Marca' : 'Gestión de Marcas'}</h3>
            <form onSubmit={guardarMarca} className="flex gap-2 mb-4">
                <input type="text" required className="flex-1 px-4 py-2 bg-slate-50 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500" value={nuevaMarca} onChange={(e) => setNuevaMarca(e.target.value)} placeholder="Ej: Bosch"/>
                <button type="submit" className={`text-white px-4 rounded-lg font-bold transition-colors ${marcaEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>{marcaEditando ? 'Guardar' : '+'}</button>
                {marcaEditando && <button type="button" onClick={() => { setMarcaEditando(null); setNuevaMarca(''); }} className="bg-slate-200 text-slate-700 px-3 rounded-lg font-bold hover:bg-slate-300">X</button>}
            </form>
            <div className="flex-1 max-h-40 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50">
                <table className="w-full text-sm text-left"><tbody className="divide-y divide-slate-200">
                    {marcasLista.map(m => (<tr key={m.id} className="hover:bg-white transition-colors"><td className="p-3 font-medium text-slate-700">{m.nombre}</td><td className="p-3 flex gap-3 justify-end"><button onClick={() => { setMarcaEditando(m.id); setNuevaMarca(m.nombre); }} className="text-blue-600 font-bold hover:text-blue-800">Editar</button><button onClick={() => eliminarMarca(m.id, m.nombre)} className="text-red-500 font-bold hover:text-red-700">Borrar</button></td></tr>))}
                </tbody></table>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Añadir Categoría</h3>
            <form onSubmit={guardarNuevaCategoria} className="flex gap-2">
                <input type="text" required className="flex-1 px-4 py-2 bg-slate-50 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} placeholder="Ej: Baterías"/>
                <button type="submit" className="bg-slate-900 text-white px-4 rounded-lg font-bold hover:bg-slate-800">+</button>
            </form>
        </div>
      </div>

      {/* 3. GESTIÓN DE VEHÍCULOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b"><h2 className="text-xl font-bold text-slate-800">2. Gestión de Flota Automotriz</h2></div>
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/3 p-6 border-r border-slate-200"><h3 className="font-bold text-indigo-600 mb-4">{vehiculoEditando ? '✏️ Editando Auto' : '➕ Nuevo Auto'}</h3><form onSubmit={guardarVehiculo} className="space-y-3"><input type="text" name="marca_auto" placeholder="Marca (Ej: Toyota)" className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={nuevoVehiculo.marca_auto} onChange={manejarCambioVehiculo} required/><input type="text" name="modelo" placeholder="Modelo (Ej: Yaris)" className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={nuevoVehiculo.modelo} onChange={manejarCambioVehiculo} required/><div className="flex gap-2"><input type="number" name="anio_inicio" placeholder="Año Inic." className="w-1/2 p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={nuevoVehiculo.anio_inicio} onChange={manejarCambioVehiculo}/><input type="number" name="anio_fin" placeholder="Año Fin" className="w-1/2 p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={nuevoVehiculo.anio_fin} onChange={manejarCambioVehiculo}/></div><button className={`w-full text-white p-2.5 rounded-lg font-bold transition-colors ${vehiculoEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{vehiculoEditando ? 'Actualizar Vehículo' : 'Guardar Vehículo'}</button></form></div>
          <div className="lg:w-2/3 max-h-72 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 sticky top-0 uppercase text-xs text-slate-500"><tr className="font-bold"><th className="p-4">Vehículo</th><th className="p-4 text-center">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{vehiculosLista.map(v => (<tr key={v.id} className="hover:bg-slate-50 transition-colors"><td className="p-4 font-bold text-slate-700">{v.marca_auto} {v.modelo} <span className="font-normal text-slate-400">({v.anio_inicio}-{v.anio_fin || 'Pres'})</span></td><td className="p-4 flex justify-center gap-2"><button onClick={() => {setNuevoVehiculo(v); setVehiculoEditando(v.id)}} className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded font-bold hover:bg-indigo-100">Editar</button><button onClick={() => eliminarVehiculo(v.id, v.modelo)} className="text-red-500 bg-red-50 px-3 py-1 rounded font-bold hover:bg-red-100">Borrar</button></td></tr>))}</tbody></table></div>
        </div>
      </div>

      {/* 4. AJUSTES DE CUENTA (PERFIL) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
            <div><h2 className="text-xl font-bold text-slate-800">Ajustes de Cuenta</h2><p className="text-xs text-slate-500">Cambia tus credenciales de acceso al sistema.</p></div>
            <button onClick={() => setEditandoPerfil(!editandoPerfil)} className="text-sm font-bold text-blue-600 hover:underline">{editandoPerfil ? 'Cerrar Edición' : 'Editar Credenciales'}</button>
        </div>
        {editandoPerfil && (
            <form onSubmit={guardarPerfil} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white">
                <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre de Usuario</label><input type="text" className="w-full p-2.5 bg-slate-100 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500" value={perfil.nombre_usuario} onChange={(e) => setPerfil({...perfil, nombre_usuario: e.target.value})} required/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nueva Contraseña</label><input type="password" placeholder="Escribe tu nueva clave" className="w-full p-2.5 bg-slate-100 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500" value={perfil.contrasena} onChange={(e) => setPerfil({...perfil, contrasena: e.target.value})} required/></div>
                <button type="submit" className="bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition shadow-md">Guardar Nuevos Datos</button>
            </form>
        )}
      </div>

      {/* 5. AUDITORÍA DE INVENTARIO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b"><h2 className="text-xl font-bold text-slate-800">3. Auditoría de Repuestos ({inventario.length})</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-white border-b uppercase text-xs text-slate-400 font-black"><tr><th className="p-4">Código</th><th className="p-4">Marca</th><th className="p-4 text-center">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{inventario.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="p-4 font-bold text-slate-800 flex items-center gap-3"><img src={p.imagen_url || "https://cdn-icons-png.flaticon.com/512/3063/3063822.png"} className="w-10 h-10 object-cover rounded border"/> {p.codigo_pieza}</td><td className="p-4"><p className="font-bold text-slate-700">{p.marca}</p><p className="text-xs text-slate-500">{p.categoria}</p></td><td className="p-4 text-center space-x-2"><button onClick={() => iniciarEdicionRepuesto(p)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition">Editar</button><button onClick={() => eliminarRepuesto(p.id, p.codigo_pieza)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition">Borrar</button></td></tr>))}</tbody></table></div>
      </div>
      <div className="text-center text-slate-400 text-xs pb-10">Sistema de Autogestión | Pasantías Profesionales Andersson</div>
    </div>
  );
}

export default Admin;