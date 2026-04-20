# Lider Media

Repositorio de archivos multimedia del sistema **Lider Online**. Almacena todos los archivos binarios subidos o generados por lider-admin y lider-app.

## Estructura

```
lider-media/
└── productos/      # Imágenes de productos subidas desde lider-admin
```

---

## Uso

### Subida de imágenes

Las imágenes se suben a través del endpoint:

```
POST /lider-admin/api/upload.php
```

- Campo del formulario: `imagen`
- Formatos aceptados: JPG, PNG, WEBP, GIF
- Tamaño máximo: 5 MB
- Nombre generado automáticamente: `{timestamp}_{random8}.{ext}`

La respuesta devuelve la URL relativa lista para usar:

```json
{
  "ok": true,
  "archivo": "1714000000_a3f9c1b2.jpg",
  "url": "../lider-media/productos/1714000000_a3f9c1b2.jpg"
}
```

### Acceso desde la app

Las imágenes se referencian con ruta relativa desde lider-app y lider-admin:

```
../lider-media/productos/nombre-del-archivo.jpg
```

---

## Notas

- La carpeta `productos/` debe tener permisos de escritura para el servidor web.
- Los archivos se sirven directamente como estáticos, sin procesamiento PHP.
- No se almacena ningún otro tipo de archivo en esta carpeta por ahora.
