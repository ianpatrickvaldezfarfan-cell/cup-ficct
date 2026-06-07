# CU6 - Gestionar Pagos

**Actor:** Postulante  
**Ruta:** `POST /api/registro/paso2`  
**Controller:** `RegistroController@paso2`

## Diagrama de Secuencia

```
Postulante → «UI» PasarelaPago → «CC» RegistroController
          → «E» Pagos → «E» Usuarios

1: iniciarPago(postulacion_id, concepto, monto: Bs. 700)
1.1: procesarPago(postulacion_id, monto, concepto)
1.2: enviarTransaccion(monto, datos) - Controller → Pagos
1.3: [referenciaTransaccion]

ALT [pago PENDIENTE]:
    1.6: bloquearAvanceInscripcion()
    1.8: mostrarEstadoPago(PENDIENTE)

ALT [pago COMPLETADO]:
    1.4: registrarPago(postulacion_id, concepto, monto,
         fecha, referencia, estado: COMPLETADO)
    1.5: [pagoRegistrado]
    1.7b: crearUsuario(username=inicial+apellidos, password=aleatorio)
    1.7c: actualizarPostulacion(estado: EN PROCESO)
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/RegistroController.php` → `paso2()`
- Frontend: `resources/js/components/PasarelaPago.jsx`
- Ruta: `POST /api/registro/paso2`

## Metodos implementados

- `RegistroController@paso2()`: INSERT pagos (COMPLETADO) → genera credenciales → INSERT usuarios (rol_id=3) → UPDATE postulaciones (EN PROCESO)

## Descripcion

Pasarela de pago simulada por Bs. 700.  
Al completar el pago:
1. INSERT en `pagos` con estado `COMPLETADO` y referencia `REF-{id}-2026`
2. Genera username: inicial del nombre + apellidos sin espacios
3. Genera password aleatorio: 2 mayusculas + 4 digitos + 2 minusculas
4. INSERT en `usuarios` (rol_id=3)
5. Vincula usuario al postulante (UPDATE postulantes SET usuario_id)
6. UPDATE postulaciones SET estado_admision = 'EN PROCESO'
