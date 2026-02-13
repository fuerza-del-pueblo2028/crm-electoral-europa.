# 📦 Sistema de Backup Automático - CRM Electoral

## Descripción

Sistema de backup automático que se ejecuta **cada domingo a las 2:00 AM** y guarda copias de seguridad en GitHub Releases.

**Configuración actual:**
- ✅ **Frecuencia:** Semanal (domingos)
- ✅ **Almacenamiento:** GitHub Releases
- ✅ **Retención:** Últimos 3 meses (~12 backups)
- ✅ **Contenido:** Todas las tablas + índice de Storage

---

## 🚀 Configuración Inicial

### Paso 1: Agregar Secrets a GitHub

Los backups necesitan credenciales de Supabase. Debes agregarlas como **Secrets** en GitHub:

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. **Click en "New repository secret"**
4. Agrega estos 2 secrets:

| Nombre | Valor |
|--------|-------|
| `SUPABASE_URL` | Tu URL de Supabase (ej: `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (Dashboard → Settings → API) |

> **⚠️ IMPORTANTE:** Usa el **Service Role Key**, NO la Anon Key. El Service Role Key tiene acceso completo para hacer backups.

---

### Paso 2: Probar Backup Manual

Antes de que se ejecute automáticamente, prueba el backup manualmente:

```bash
# Configurar variables de entorno temporalmente
$env:NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_aqui"

# Ejecutar backup
node scripts/backup.js
```

Si todo funciona, verás:
```
✅ BACKUP COMPLETADO

📊 Resumen:
   - afiliados: 150 registros
   - afiliados_historial: 45 registros
   ...
📦 Archivo: backups\backup_2026-02-01.zip
```

---

### Paso 3: Hacer Push del Código

Una vez probado localmente:

```bash
git add .github/workflows/backup.yml scripts/backup.js scripts/restore.js
git commit -m "feat: sistema de backup automático semanal"
git push origin main
```

---

## ⏰ Ejecución Automática

### GitHub Actions

El backup se ejecuta automáticamente **cada domingo a las 2:00 AM** vía GitHub Actions.

**Para ver el estado:**
1. Ve a tu repositorio en GitHub
2. Click en pestaña **"Actions"**
3. Busca el workflow **"Backup Semanal Automático"**

**Para ejecutar manualmente:**
1. Actions → **Backup Semanal Automático**
2. Click en **"Run workflow"**
3. **"Run workflow"** (botón verde)

---

## 📥 Descargar Backups

Los backups se guardan en **GitHub Releases**.

### Desde GitHub:

1. Ve a tu repositorio
2. Click en **"Releases"** (sidebar derecha)
3. Encuentra el backup que necesitas (ej: `backup-2026-02-01`)
4. **Descarga** el archivo `backup_2026-02-01.zip`

### Estructura del ZIP:

```
backup_2026-02-01.zip
├── metadata.json (info del backup)
├── afiliados.json
├── afiliados_historial.json
├── usuarios.json
├── actas_electorales.json
├── comunicaciones.json
└── storage_index.json (lista de fotos)
```

---

## 🔄 Restaurar un Backup

> **⚠️ PELIGRO:** La restauración SOBRESCRIBE todos los datos actuales.
> Solo úsala en emergencias o en una base de datos de prueba.

### Opción 1: Restauración Automática (Script)

```bash
# Descargar el backup que quieres restaurar
# Luego ejecutar:

node scripts/restore.js backups/backup_2026-02-01.zip
```

El script te pedirá confirmación:
```
⚠️  ADVERTENCIA: Esta operación SOBRESCRIBIRÁ todos los datos actuales.

¿Estás seguro de continuar? (escribe 'SI' para confirmar): SI
```

---

### Opción 2: Restauración Manual

1. **Descomprime** el archivo ZIP
2. **Abre Supabase** → SQL Editor
3. **Para cada tabla**, elimina datos y reinserta:

```sql
-- Ejemplo para tabla afiliados
DELETE FROM afiliados;

-- Luego inserta los datos del JSON manualmente
-- o usa un script de importación
```

---

## 📊 Monitoreo

### Ver Historial de Backups

```bash
# Ver todos los backups en GitHub Releases
gh release list
```

### Verificar Tamaño

Los backups típicamente pesan:
- **Pequeño** (<1 MB): <500 afiliados
- **Mediano** (1-5 MB): 500-2000 afiliados
- **Grande** (>5 MB): >2000 afiliados

---

## 🛠️ Solución de Problemas

### El backup falla en GitHub Actions

**Causa común:** Secrets mal configurados

**Solución:**
1. Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén en GitHub Secrets
2. Asegúrate de usar el **Service Role Key**, no la Anon Key
3. Revisa los logs en Actions → Click en el workflow fallido

---

### "Error: Cannot find module 'archiver'"

**Solución:**
```bash
npm install
```

---

### Backup muy grande (>100 MB)

Si tienes muchos datos, considera:
1. Reducir frecuencia (mensual en vez de semanal)
2. Exportar solo tablas críticas
3. Usar Supabase Pro para backups nativos

---

## 🔐 Seguridad

### Datos Sensibles

Los backups contienen:
- ❌ Cédulas
- ❌ Emails
- ❌ Teléfonos
- ❌ Información electoral

**Medidas de seguridad:**
✅ GitHub Releases son privadas (solo tu equipo puede acceder)
✅ Service Role Key está en Secrets (encriptado)
✅ Los backups se eliminan automáticamente después de 3 meses

**NO HAGAS:**
❌ Descargar backups en computadoras públicas
❌ Compartir los ZIPs por email/WhatsApp
❌ Subir a Google Drive público

---

## 📅 Calendario de Retención

| Semana | Backup | Estado |
|--------|--------|--------|
| Semana 1-12 | Se mantienen | ✅ Disponibles |
| Semana 13+ | Se eliminan automáticamente | 🗑️ Borrados |

**Ejemplo:**
- Hoy es 1 de febrero (semana 5)
- Backups disponibles: semanas 1-4 (últimos 4 domingos)
- En la semana 14, se borra el backup de la semana 1

---

## 🚨 Casos de Uso

### Caso 1: Error humano (alguien borró datos por accidente)

1. Descarga el backup más reciente
2. Ejecuta `node scripts/restore.js backup.zip`
3. Confirma con `SI`
4. Verifica que los datos estén restaurados

### Caso 2: Migración a nuevo servidor

1. Descarga backup
2. Configura nueva instancia de Supabase
3. Actualiza `.env.local` con nuevas credenciales
4. Ejecuta restore

### Caso 3: Auditoría/Compliance

1. Ve a Releases
2. Descarga backup del período requerido
3. Envía a auditor (asegúrate de encriptarlo primero)

---

## 📞 Soporte

Si tienes problemas con los backups:

1. **Revisa logs** en GitHub Actions
2. **Prueba manualmente**: `node scripts/backup.js`
3. **Verifica credenciales** en Secrets
4. **Contacta soporte** de Supabase si el problema persiste

---

## 📝 Cambios Futuros

Si necesitas modificar la configuración:

**Cambiar frecuencia:**
Edita `.github/workflows/backup.yml`:
```yaml
# Diario a las 3 AM
cron: '0 3 * * *'

# Lunes a las 1 AM
cron: '0 1 * * 1'
```

**Cambiar retención:**
Edita `keep_latest` en `.github/workflows/backup.yml`:
```yaml
keep_latest: 24  # 6 meses de backups semanales
```

**Agregar más tablas:**
Edita `TABLES` en `scripts/backup.js`.

---

✅ **Sistema configurado y listo para usar**
