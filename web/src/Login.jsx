import { useState } from 'react';

function Login({ alEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const manejarLogin = async (e) => {
    e.preventDefault();
    const respuesta = await fetch('http://127.0.0.1:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });
    
    const data = await respuesta.json();
    if (data.success) {
      alEntrar(); // Función que le avisa a App.jsx que ya entramos
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <form onSubmit={manejarLogin} className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md">
        <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">Acceso Administrativo</h2>
        {error && <p className="text-red-500 text-sm font-bold mb-4 bg-red-50 p-3 rounded-lg text-center">{error}</p>}
        <div className="space-y-4">
          <input 
            type="text" placeholder="Usuario" 
            className="w-full p-4 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onChange={(e) => setUsuario(e.target.value)}
          />
          <input 
            type="password" placeholder="Contraseña" 
            className="w-full p-4 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            ENTRAR AL PANEL
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;