# Dpto Felipe — microsite

Sitio estático (HTML + CSS + JS, sin build). Mapa con Leaflet + teselas Esri (sin API key).

## Editar la selección
Todo está en **`data.js`**:
- **Quitar** una propiedad: borra su bloque `{ ... }` de `PROPERTIES`.
- **Agregar**: copia un bloque existente y cambia los campos. `price: { clp: 1350000 }` o `price: { uf: 32 }`.
- **UF**: actualiza `UF_VALUE` y `UF_DATE`; los precios en UF se reconvierten solos.
- **Fotos**: `photos` es una lista de URLs; la primera es la portada.
- `approx: true` marca la ubicación como aproximada; `priceFrom: true` muestra "desde".

## Ver local
```
python -m http.server 5173   # y abrir http://localhost:5173
```

## Publicar
Está publicado con GitHub Pages: cada `git push` a `main` actualiza el sitio.
