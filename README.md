# Q Berries · Dashboard Rendimientos (Licapa)

PWA gerencial para ver **Suma de C** (cajas) por trabajador, grupo, variedad y fecha — con gráficos interactivos (pan/zoom), tablas y modales.

Zona horaria: `America/Lima`. UI en español (Perú).

## Arquitectura (mismo patrón que Tarjeta Pallet)

```
[Chrome / PWA]
   index.html + js + css
        |
        | GET /api/produccion?action=reporteProduccion&fechas=2026-08-11,2026-08-10
        v
[Netlify Function produccion.js]
   inyecta API_TOKEN
        |
        v
[Google Apps Script Code.gs]
        |
        v
[Google Sheet — una hoja por fecha]
```

### Hojas Sheets

- Nombre preferido: `YYYY-MM-DD` (ej. `2026-08-11`) o `DD/MM/YYYY`.
- Puedes tener **solo hoy + ayer**, o **N fechas** (va creciendo hoja por hoja).
- Encabezados (fila 1), igual que `Produccion_Licapa.xlsx`:

`Etiqueta | Huerto | Lote | H | Variedad | Grupo | DNI | CI | Apellido | Nombre | Fecha | Hora | P | T | Q | F | C | FP`

El GET agrega **Suma de C por CI** (como la tabla dinámica Excel).

### GET preciso

Base (tras deploy): `/api/produccion`

| action | params | uso |
|--------|--------|-----|
| `listarHojas` | — | fechas disponibles |
| `reporteProduccion` | `fecha` / `fechas=a,b` / `comparar=1` / `ayer=1` / `todas=1` | KPIs + filas |
| | `grupo`, `variedad`, `q`, `ci`, `limit`, `offset`, `soloKpis=1`, `top` | filtros |
| `detalleTrabajador` | `ci` + fechas | por hora / lote |
| `health` | — | ping |

Respuesta típica: `{ ok, data[], kpis: { totalCajas, totalTrabajadores, porGrupo, porFecha, ... }, filtros, actualizado }`.

## Trabajadores activos

`data/trabajadores.json` sale del Excel **Listado de Trabajadores**.
Por **DNI/CI** se completa nombre (resuelve los `S/N` del archivo de producción).

## Modo demo (local)

Sin Netlify/Apps Script, la app lee:

- `data/produccion_agg.json` — agregado real de `Produccion_Licapa` (2026-08-10) + día demo 2026-08-11 para comparar.
- `data/trabajadores.json` — padrón activo.

## Deploy Netlify

1. Sube el repo (publish `.`).
2. Env vars:
   - `APPS_SCRIPT_URL` = URL `/exec` del deployment
   - `API_TOKEN` = secreto (también en Script Properties de Apps Script)
3. Pega `apps-script/Code.gs` en el proyecto Apps Script del Sheet → **Nueva versión** del web app.
4. En el Sheet: crea hojas `YYYY-MM-DD` y pega/importa la producción del día.

## Desarrollo local

Sirve la carpeta con cualquier static server, por ejemplo:

```bash
npx --yes serve .
```

Abre `http://localhost:3000` (o el puerto que indique).

## UX

- Comparar hoy / ayer (botón).
- Filtros: fecha A/B, grupo, variedad, búsqueda DNI/nombre.
- Gráficos arrastrables (Chart.js Zoom + Hammer).
- Click en barra o fila → modal del trabajador.
- Export CSV.
