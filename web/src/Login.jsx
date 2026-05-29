import { useState } from 'react';

const URL_BACKEND = 'https://autolog-catalogo.onrender.com';

export default function Login({ alEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true); setError('');
    try {
      const res = await fetch(`${URL_BACKEND}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });
      const data = await res.json();
      if (data.success) alEntrar(usuario);
      else setError(data.mensaje || 'Credenciales incorrectas');
    } catch (err) { setError("Error de conexión"); } 
    finally { setCargando(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-screen">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl border-2 border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Acceso Seguro</h2>
          <p className="text-sm font-bold text-slate-500">Panel de Administración B2B</p>
        </div>
        {error && <div className="mb-6 p-4 bg-red-100 text-red-700 font-black text-sm rounded-xl border-2 border-red-200 text-center animate-pulse">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label className="block text-sm font-black text-slate-700 mb-2">USUARIO</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-300 p-4 rounded-xl font-bold outline-none focus:border-blue-600 transition" value={usuario} onChange={(e) => setUsuario(e.target.value)} /></div>
          <div><label className="block text-sm font-black text-slate-700 mb-2">CONTRASEÑA</label><input type="password" required className="w-full bg-slate-50 border-2 border-slate-300 p-4 rounded-xl font-bold outline-none focus:border-blue-600 transition" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button type="submit" disabled={cargando} className="w-full bg-slate-900 text-white font-black text-lg py-4 rounded-xl hover:bg-blue-600 transition disabled:bg-slate-300 shadow-md">{cargando ? 'Verificando...' : 'INGRESAR'}</button>
        </form>
      </div>
    </div>
  );
}