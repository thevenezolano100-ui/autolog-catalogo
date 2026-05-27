# 🧪 GUÍA DE PRUEBAS - FASE 1 SEGURIDAD

## ✅ VERIFICACIÓN DE LA IMPLEMENTACIÓN

Esta guía te permitirá probar paso a paso todas las mejoras de seguridad implementadas.

---

## 📋 REQUISITOS PREVIOS

1. **Servidor corriendo**: El backend debe estar ejecutándose en `http://localhost:3000`
2. **Base de datos conectada**: PostgreSQL debe estar disponible
3. **Herramientas necesarias**:
   - Terminal/Consola
   - curl (para pruebas de API)
   - Postman o Insomnia (opcional, para pruebas visuales)

---

## 🔍 PASO 1: VERIFICAR QUE EL SERVIDOR ESTÁ CORRIENDO

### Comando de prueba:
```bash
curl http://localhost:3000/api/health
```

### Respuesta esperada:
```json
{
  "success": true,
  "mensaje": "Servidor funcionando correctamente",
  "timestamp": "2026-05-27T04:13:03.613Z",
  "environment": "development"
}
```

✅ **Si ves esto**: El servidor está corriendo correctamente  
❌ **Si hay error**: Ejecuta `npm start` en la raíz del proyecto

---

## 🔐 PASO 2: PROBAR AUTENTICACIÓN JWT

### 2.1 Intentar login sin credenciales (debe fallar)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Respuesta esperada** (error de validación):
```json
{
  "success": false,
  "errors": [
    {"msg": "El nombre de usuario es requerido"},
    {"msg": "La contraseña es requerida"}
  ]
}
```

### 2.2 Intentar login con credenciales incorrectas
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "password": "incorrecta"}'
```

**Respuesta esperada**:
```json
{
  "success": false,
  "mensaje": "Credenciales incorrectas"
}
```

### 2.3 Login exitoso (con credenciales reales)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "admin", "password": "admin123"}'
```

**Respuesta esperada** (éxito):
```json
{
  "success": true,
  "mensaje": "Acceso concedido",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "nombre_usuario": "admin",
      "rol": "admin"
    }
  }
}
```

📝 **IMPORTANTE**: Copia el token recibido para las siguientes pruebas

---

## 🛡️ PASO 3: PROBAR RUTAS PROTEGIDAS CON JWT

### 3.1 Intentar acceder sin token (debe fallar)
```bash
curl http://localhost:3000/api/usuario/perfil
```

**Respuesta esperada**:
```json
{
  "success": false,
  "mensaje": "No se proporcionó token de autenticación"
}
```

### 3.2 Acceder con token válido
Reemplaza `TU_TOKEN_AQUI` con el token obtenido en el login:

```bash
curl http://localhost:3000/api/usuario/perfil \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

**Respuesta esperada**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre_usuario": "admin",
    "rol": "admin",
    ...
  }
}
```

### 3.3 Acceder con token inválido
```bash
curl http://localhost:3000/api/usuario/perfil \
  -H "Authorization: Bearer token_invalido_12345"
```

**Respuesta esperada**:
```json
{
  "success": false,
  "mensaje": "Token inválido"
}
```

---

## 📁 PASO 4: VERIFICAR ESTRUCTURA DE ARCHIVOS

### Ejecutar en terminal:
```bash
tree src -L 2
```

### Estructura esperada:
```
src/
├── config/
│   └── index.js          # ✅ Configuración centralizada
├── db.js                 # ✅ Conexión a BD
├── index.js              # ✅ Punto de entrada principal
├── middleware/
│   ├── auth.js           # ✅ Middleware JWT
│   ├── authService.js    # ✅ Servicio de autenticación
│   ├── error.js          # ✅ Manejo de errores
│   ├── upload.js         # ✅ Upload de archivos
│   └── validacion.js     # ✅ Validador centralizado
└── routes/
    ├── auth.js           # ✅ Rutas de autenticación
    ├── usuario.js        # ✅ Rutas de usuario
    ├── marcas.js         # ✅ CRUD marcas
    ├── categorias.js     # ✅ CRUD categorías
    ├── vehiculos.js      # ✅ CRUD vehículos
    ├── productos.js      # ✅ CRUD productos
    └── busqueda.js       # ✅ Búsqueda
```

---

## 🔑 PASO 5: VERIFICAR VARIABLES DE ENTORNO

### 5.1 Verificar que existe .env
```bash
ls -la .env
```

### 5.2 Verificar que NO hay credenciales hardcodeadas
```bash
grep -r "postgresql://" src/ --include="*.js"
```

**Resultado esperado**: No debe haber resultados (0 coincidencias)

### 5.3 Verificar contenido de .env.example
```bash
cat .env.example
```

Debe mostrar la plantilla con todas las variables necesarias.

---

## 📊 PASO 6: PROBAR CRUD DE MARCAS

### 6.1 Obtener todas las marcas
```bash
curl http://localhost:3000/api/marcas
```

**Respuesta esperada**:
```json
[
  {"id": 1, "nombre": "Toyota"},
  {"id": 2, "nombre": "Honda"},
  ...
]
```

### 6.2 Crear nueva marca (con autenticación)
```bash
curl -X POST http://localhost:3000/api/marcas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"nombre": "Ford"}'
```

**Respuesta esperada**:
```json
{"success": true}
```

### 6.3 Validar creación (nombre vacío debe fallar)
```bash
curl -X POST http://localhost:3000/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nombre": ""}'
```

**Respuesta esperada**:
```json
{
  "success": false,
  "mensaje": "El nombre de la marca es requerido"
}
```

---

## 🔄 PASO 7: MIGRACIÓN DE CONTRASEÑAS (OPCIONAL)

Si tienes usuarios con contraseñas en texto plano:

```bash
curl -X POST http://localhost:3000/api/auth/migrar-passwords
```

**Respuesta esperada**:
```json
{
  "success": true,
  "mensaje": "Migración de contraseñas completada"
}
```

⚠️ **NOTA**: Este endpoint solo debe usarse UNA VEZ. Después eliminarlo del código.

---

## 📈 CHECKLIST DE VERIFICACIÓN FINAL

Marca cada ítem completado:

- [ ] ✅ Health check responde correctamente
- [ ] ✅ Login sin credenciales retorna error de validación
- [ ] ✅ Login con credenciales incorrectas retorna error 401
- [ ] ✅ Login exitoso retorna token JWT
- [ ] ✅ Ruta protegida sin token retorna error 401
- [ ] ✅ Ruta protegida con token válido funciona
- [ ] ✅ Ruta protegida con token inválido retorna error 401
- [ ] ✅ No hay credenciales hardcodeadas en el código
- [ ] ✅ Archivo .env existe con configuraciones reales
- [ ] ✅ Archivo .env.example existe como plantilla
- [ ] ✅ CRUD de marcas funciona correctamente
- [ ] ✅ Validaciones de datos funcionan
- [ ] ✅ Estructura MVC está implementada

---

## 🎯 RESULTADOS ESPERADOS DE LA FASE 1

| Característica | Antes | Después |
|---------------|-------|---------|
| Credenciales | Hardcodeadas | Variables de entorno |
| Contraseñas | Texto plano | Hash bcrypt (12 rounds) |
| Autenticación | Sesiones básicas | JWT tokens |
| Validaciones | Manuales/inexistentes | express-validator |
| Errores | Sin manejo | Middleware global |
| CORS | Configuración básica | Configuración segura |
| Estructura | Todo en un archivo | MVC organizado |

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema: "Error: connect ECONNREFUSED"
**Solución**: La base de datos no está corriendo. Verifica tu conexión PostgreSQL.

### Problema: "Token expirado"
**Solución**: Los tokens expiran en 24h por defecto. Haz login nuevamente.

### Problema: "Cannot find module 'bcrypt'"
**Solución**: Ejecuta `npm install` para instalar dependencias.

### Problema: "Port 3000 already in use"
**Solución**: Mata el proceso: `pkill -f "node src/index.js"` y reinicia.

---

## 📞 SOPORTE

Si encuentras algún problema durante las pruebas:

1. Revisa los logs del servidor: `tail -f server.log`
2. Verifica que todas las dependencias estén instaladas
3. Confirma que el archivo `.env` tenga valores correctos
4. Asegúrate de que la base de datos esté accesible

---

**🎉 ¡Fase 1 Completada!** 

Una vez verificadas todas las pruebas, podemos continuar con la **Fase 2: Arquitectura Backend Avanzada**.
