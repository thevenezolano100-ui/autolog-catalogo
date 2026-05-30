const guardarVehiculo = async () => {
    if (!isOnline) return alert("⚠️ Necesitas conexión a internet.");
    if (!nuevoVehiculo.marca_auto || !nuevoVehiculo.modelo) return alert('⚠️ Llena marca y modelo.');
    
    try {
        setMensaje('⏳ Conectando con Render/Neon...');
        const res = await fetch(`${URL_BACKEND}/api/vehiculos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoVehiculo)
        });
        
        const respuestaTexto = await res.text();
        setMensaje('');
        
        if(res.ok) {
            alert('✅ Vehículo registrado exitosamente');
            setNuevoVehiculo({ marca_auto: '', modelo: '' });
            cargarTodo();
        } else {
            // LECTOR DE ERRORES MEJORADO
            try {
                const err = JSON.parse(respuestaTexto);
                alert(`❌ Error Base de Datos: ${err.error}`);
            } catch {
                alert(`❌ RENDER ENVIÓ ESTE ERROR HTML:\n\n${respuestaTexto.substring(0, 150)}...`);
            }
        }
    } catch (e) {
        setMensaje('');
        alert(`❌ Falla de Servidor (Caído): ${e.message}`);
    }

  };
  export default Admin;