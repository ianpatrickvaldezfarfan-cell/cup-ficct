# CU5 - Gestionar Documentos de Postulantes

**Actor:** Postulante  
**Ruta:** `POST /api/registro/paso1b`  
**Controller:** `RegistroController@paso1b`

## Diagrama de Secuencia

```
Postulante → «UI» ModuloDocumentos → «CC» RegistroController
          → «S» ServidorArchivos → «E» DocumentosPostulantes

1: adjuntarDocumento(tipo, archivo) - Postulante → UI
1.1: procesarDocumento(postulacion_id, tipo, archivo)

ALT [formato invalido: no es PDF/JPG/PNG]:
    1.6: retornarError(formato no permitido)
    1.6b: mostrarError(formato no permitido)

ALT [tamano excedido: mayor a 5MB]:
    1.7: retornarError(archivo demasiado grande)
    1.7b: mostrarError(archivo demasiado grande)

ALT [archivo valido]:
    1.2: almacenarArchivo(archivo) - Controller → ServidorArchivos
    1.3: [urlArchivo] - ServidorArchivos → Controller
    1.4: registrarDocumento(postulacion_id, tipo, urlArchivo)
    1.5: [documentoRegistrado]
    1.8: mostrarConfirmacion(documento adjuntado correctamente)
```

## Archivos del caso de uso

- Backend: `app/Http/Controllers/RegistroController.php` → `paso1b()`
- Frontend: `resources/js/components/SubirDocumentos.jsx`
- Ruta: `POST /api/registro/paso1b`

## Metodos implementados

- `RegistroController@paso1b()`: valida mimes + max 5MB → almacena en storage → UPDATE documentos_postulantes

## Descripcion

Subida de 4 documentos requeridos para la postulacion:
- Certificado de Nacimiento
- CI Anverso/Reverso
- Fotografia Fondo Rojo
- Titulo de Bachiller

**Formatos aceptados:** PDF, JPG, PNG  
**Tamano maximo:** 5 MB por archivo  
**Almacenamiento:** `storage/documentos/{postulacion_id}/`  
El symlink `public/storage` debe existir (`php artisan storage:link`).
