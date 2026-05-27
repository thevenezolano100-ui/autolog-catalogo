import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Catalogo from './Catalogo';
import Login from './Login';
import Dashboard from './Dashboard';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  return (
    <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-tight hover:text-emerald-400 transition">
          🏎️ AutoLog Parts
        </Link>
        <div className="flex items-center space-x-6">
          <Link to="/" className={\hover:text-emerald-400 \\}>Catálogo</Link>
          
          {user && user.rol === 'admin' && (
            <Link to="/dashboard" className={\hover:text-emerald-400 \\}>
              📊 Dashboard
            </Link>
          )}

          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Hola, {user.nombre}</span>
              <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition">Salir</button>
            </div>
          ) : (
            <Link to="/login" className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-medium transition">Acceso Supervisor</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

function App() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/dashboard" element={user && user.rol === 'admin' ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
