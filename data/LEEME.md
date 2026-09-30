# data

Archivos fijos que la PWA lee al abrir. La cosecha del día no está aquí: llega de Google Apps Script (`?action=todo`).

| Archivo | Quién lo lee | Qué es |
|---|---|---|
| `trabajadores.json` | `js/workers.js` | Padrón. Lista de `{ dni, nombre, cargo, fechaIngreso }`. Completa el nombre cuando la hoja de cosecha trae solo el DNI. |
| `plano-cosecha.json` | `js/plano.js` | Plano Etapa I. Módulos, hectáreas y lotes (`lote` → `modulo`). |
| `descartes.json` | `js/descartes.js` | Jarras de descarte por fecha y LIC. Forma: `{ dias: [{ fecha, TOTAL_JARRAS_DESCARTE: [{ nombre, lic, jarras_de_descarte }] }] }`. |

El historial de cosecha por persona vive en `js/historial-data.js`. El Excel nuevo se deja en `historial-in/`.
