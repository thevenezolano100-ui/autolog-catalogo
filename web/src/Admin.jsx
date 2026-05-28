import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
const URL_BACKEND = 'https://autolog-catalogo.onrender.com';

function Admin() {
  const [formulario, setFormulario] = useState({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '' });
  const [inventario, setInventario] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const cargarDatosBasicos = async () => {
    const resInv = await fetch(`${URL_BACKEND}/api/productos`); setInventario(await resInv.json());
  };
  useEffect(() => { cargarDatosBasicos(); }, []);

  const procesarExcel = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = async (evento) => {
      const libro = XLSX.read(new Uint8Array(evento.target.result), { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]]);
      for (let fila of filas) {
        const formData = new FormData();
        formData.append('codigo_pieza', fila.codigo);
        formData.append('descripcion', fila.descripcion);
        formData.append('precio', fila.precio || 0);
        formData.append('stock', fila.stock || 0);
        await fetch(`${URL_BACKEND}/api/productos`, { method: 'POST', body: formData });
      }
      cargarDatosBasicos();
      alert("Excel cargado");
    };
    reader.readAsArrayBuffer(archivo);
  };

  const guardarRepuesto = async (e) => {
    e.preventDefault();
    const datos = new FormData();
    datos.append('codigo_pieza', formulario.codigo_pieza);
    datos.append('descripcion', formulario.descripcion);
    datos.append('precio', formulario.precio || 0);
    datos.append('stock', formulario.stock || 0);

    await fetch(`${URL_BACKEND}/api/productos`, { method: 'POST', body: datos });
    setFormulario({ id: null, codigo_pieza: '', descripcion: '', precio: '', stock: '' });
    cargarDatosBasicos();
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      
      <div className="bg-white p-8 rounded-xl border">
        <h2 className="text-2xl font-black mb-6">Agregar Repuesto</h2>
        <form onSubmit={guardarRepuesto} className="flex gap-4">
            <input type="text" name="codigo_pieza" placeholder="Código" className="border p-2 rounded w-full" value={formulario.codigo_pieza} onChange={e=>setFormulario({...formulario, codigo_pieza: e.target.value})} required/>
            <input type="text" name="descripcion" placeholder="Desc" className="border p-2 rounded w-full" value={formulario.descripcion} onChange={e=>setFormulario({...formulario, descripcion: e.target.value})} required/>
            <input type="number" name="precio" placeholder="Precio" className="border p-2 rounded w-32" value={formulario.precio} onChange={e=>setFormulario({...formulario, precio: e.target.value})}/>
            <input type="number" name="stock" placeholder="Stock" className="border p-2 rounded w-32" value={formulario.stock} onChange={e=>setFormulario({...formulario, stock: e.target.value})}/>
            <button type="submit" className="bg-blue-600 text-white font-bold px-6 rounded">Guardar</button>
        </form>
      </div>

      <div className="bg-emerald-50 p-8 rounded-xl border border-emerald-200">
        <h2 className="font-black text-emerald-700 mb-2">Carga Masiva (Excel)</h2>
        <input type="file" accept=".xlsx" onChange={procesarExcel} className="p-2"/>
      </div>

      <div className="bg-white p-6 rounded-xl border">
        <h2 className="text-xl font-bold mb-4">Inventario Actual ({inventario.length})</h2>
        <table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="p-2">Código</th><th className="p-2">Precio</th><th className="p-2">Stock</th></tr></thead>
        <tbody>{inventario.map(p => (<tr key={p.id} className="border-b"><td className="p-2 font-bold">{p.codigo_pieza}</td><td className="p-2">${p.precio}</td><td className="p-2">{p.stock}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
export default Admin;