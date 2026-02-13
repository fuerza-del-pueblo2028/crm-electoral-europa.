# Configuración n8n para Sincronización Europa

## Instalación de n8n (Gratuito y Open Source)

n8n es completamente gratuito en su versión auto-hospedada. Puedes ejecutarlo localmente o en un servidor.

### Opción 1: Ejecutar con Docker (Recomendado)

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Accede a: http://localhost:5678

### Opción 2: Ejecutar con NPM

```bash
npm install -g n8n
n8n start
```

---

## Workflow: Google Sheets → Supabase

### 1. Crear Workflow en n8n

1. Abre n8n en http://localhost:5678
2. Crea nuevo workflow
3. Arrastra los siguientes nodos:

### 2. Nodos del Workflow

#### Nodo 1: Google Sheets Trigger
- **Tipo**: Google Sheets
- **Operation**: On Row Added/Updated
- **Sheet ID**: `13p-uxqwkeyaxf8apluCwqel6EG8YzuMWTLqLDjVyo8g`
- **Sheet Name**: `Seccional de Madrid` (crear uno por cada seccional)
- **Polling**: Every 5 minutes

#### Nodo 2: Function  
Transformar datos al formato de Supabase:

```javascript
// Transformar datos de Google Sheets al formato Supabase
const item = items[0].json;

return [{
  json: {
    seccional: 'Madrid', // Cambiar según la hoja
    numero_recinto: item['Número Recinto'],
    nombre_recinto: item['RECINTOS'],
    zona_ciudad: item['ZONA'],
    direccion: item['DIRECCIÓN'],
    total_electores: parseInt(item['ELECTORES']) || 0,
    total_colegios: parseInt(item['TOTAL DE COLEGIOS']) || 0,
    colegios_numeros: item['COLEGIOS N°']
  }
}];
```

#### Nodo 3: Supabase
- **Operation**: Insert/Upsert
- **Table**: `europa_recintos_electorales`
- **URL**: `https://oydqzttivnrqxlziwnwn.supabase.co`
- **API Key**: `sb_publishable_nkLqGt8kGQtMJAQmXwe4Rw_PONNBBfQ`
- **Upsert**: `true`
- **On Conflict**: `seccional,numero_recinto`

---

## Workflows Necesarios

Necesitarás crear **7 workflows separados**, uno por cada hoja:

1. ✅ Seccional de Madrid → Supabase
2. ✅ Seccional de Barcelona → Supabase
3. ✅ Seccional de Milano → Supabase
4. ✅ Seccional de Holanda → Supabase
5. ✅ Seccional de Valencia → Supabase
6. ✅ Seccional de Zurich → Supabase
7. ✅ Presidentes DM Italia → Supabase

---

## Alternativa: Zapier (Versión Cloud - Tiene Plan Gratuito Limitado)

Si prefieres un servicio cloud sin instalación:

### Plan Gratuito de Zapier:
- 100 tareas/mes
- 1 Zap activo a la vez
- Polling cada 15 minutos

### Configuración:
1. Trigger: **Google Sheets - New or Updated Spreadsheet Row**
2. Action: **Webhooks - POST** to Supabase API

**URL**: `https://oydqzttivnrqxlziwnwn.supabase.co/rest/v1/europa_recintos_electorales`

**Headers**:
```
apikey: sb_publishable_nkLqGt8kGQtMJAQmXwe4Rw_PONNBBfQ
Authorization: Bearer sb_publishable_nkLqGt8kGQtMJAQmXwe4Rw_PONNBBfQ
Content-Type: application/json
Prefer: resolution=merge-duplicates
```

---

## Recomendación Final

Para tu caso (**>1000 filas en 7 hojas**), te recomiendo:

### ✅ **n8n (Auto-hospedado)**
- Completamente gratuito
- Sin límites de tareas
- Control total
- Polling más frecuente (cada 1-5 min)

### ⚠️ **Zapier** solo si:
- No puedes auto-hospedar
- Aceptas límite de 100 tareas/mes (plan gratuito)
- O pagas $19.99/mes para 750 tareas

---

## Próximos Pasos

1. **Ahora**: Crear tablas en Supabase ejecutando `supabase_europa_schema.sql`
2. **Luego**: Importar datos iniciales con `node import_europa_data.js`
3. **Finalmente**: Configurar n8n para sincronización continua
