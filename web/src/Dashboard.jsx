import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('https://autolog-catalogo-production.up.railway.app/api/dashboard/stats', {
      headers: { 'Authorization': Bearer \ }
    })
    .then(res => res.json())
    .then(json => { setData(json); setLoading(false); })
    .catch(err => { console.error(err); setLoading(false); });
  }, [token]);

  if (loading) return <div className="p-10 text-center text-xl">Cargando datos...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Error al cargar. Revisa tu conexión.</div>;

  const total = data.resumen?.total_productos || 0;
  const valor = data.resumen?.valor_inventario || 0;
  const bajos = data.alertas?.bajo_stock || [];
  const agotados = data.alertas?.sin_stock || [];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">📊 Panel de Control</h1>
      
      {/* TARJETAS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
          <p className="text-gray-500 text-sm">Total Productos</p>
          <p className="text-3xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
          <p className="text-gray-500 text-sm">Valor Inventario</p>
          <p className="text-2xl font-bold text-slate-800"></p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm">Stock Bajo (≤5)</p>
          <p className="text-3xl font-bold text-yellow-600">{bajos.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-600">
          <p className="text-gray-500 text-sm">Agotados</p>
          <p className="text-3xl font-bold text-red-600">{agotados.length}</p>
        </div>
      </div>

      {/* GRÁFICA DE BARRAS SIMPLE CON CSS (Sin librerías) */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Estado del Inventario</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Stock Normal</span><span>{Math.max(0, total - bajos.length - agotados)}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="bg-blue-500 h-4 rounded-full" style={{width: ${(Math.max(0, total - bajos.length - agotados) / (total || 1)) * 100}%}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Stock Bajo</span><span>{bajos.length}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="bg-yellow-500 h-4 rounded-full" style={{width: ${(bajos.length / (total || 1)) * 100}%}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Agotados</span><span>{agotados.length}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="bg-red-500 h-4 rounded-full" style={{width: ${(agotados.length / (total || 1)) * 100}%}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE ALERTAS */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-red-50">
          <h2 className="text-xl font-bold text-red-700">⚠️ Atención Requerida (Stock Crítico)</h2>
          <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm">
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
        
        {bajos.length === 0 && agotados.length === 0 ? (
          <div className="p-8 text-center text-green-600 font-bold">✅ ¡Todo perfecto! No hay alertas.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agotados.map((p, i) => (
                <tr key={gg-} className="bg-red-50">
                  <td className="px-6 py-4 font-medium text-red-900">{p.nombre}</td>
                  <td className="px-6 py-4">{p.marca || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold text-red-600">0</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold rounded bg-red-200 text-red-800">AGOTADO</span></td>
                </tr>
              ))}
              {bajos.map((p, i) => (
                <tr key={ajo-} className="bg-yellow-50">
                  <td className="px-6 py-4 font-medium text-yellow-900">{p.nombre}</td>
                  <td className="px-6 py-4">{p.marca || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold text-yellow-700">{p.stock}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-200 text-yellow-800">BAJO STOCK</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
