# Plan de Implementación: Sistema de Comunicaciones y Automatización

## 1. Verificación de Credenciales por Defecto
**Estado Actual:** ✅ Verificado y Funcionando.
- El sistema de login (`src/app/login/page.tsx`) ya implementa la lógica para permitir que cualquier afiliado registrado en la tabla `afiliados` pueda ingresar.
- **Credenciales:**
  - **Usuario:** Cédula (con o sin guiones).
  - **Contraseña:** Últimos 6 dígitos de la cédula.
- **Acción:** No se requieren cambios. Se mantendrá esta lógica inalterada tal como se solicitó.

---

## 2. Sistema de Bienvenida (Correo Electrónico)
**Estado Actual:** ❌ No implementado.
- Actualmente, el sistema registra al afiliado en la base de datos pero no dispara ninguna notificación.

**Plan de Implementación:**
1.  **Infraestructura de Email:**
    - Utilizaremos **Resend** (estándar moderno para Next.js) para el envío de correos transaccionales.
    - Se requiere instalar el paquete: `npm install resend`.
    - Se requiere una **API Key** de Resend (Proveer por el usuario).
2.  **Backend (API Route):**
    - Crear un endpoint `src/app/api/emails/welcome/route.ts`.
    - Este endpoint recibirá el email y nombre del afiliado y enviará una plantilla HTML elegante con el branding de la FP Europa.
3.  **Frontend (Trigger):**
    - Modificar `src/components/NewAffiliateModal.tsx`.
    - Al recibir una respuesta exitosa de Supabase (`insert`), invocar inmediatamente al endpoint de bienvenida en segundo plano (sin bloquear la UI).

---

## 3. Sistema de Comunicación Automatizada (CRM Electoral)
**Objetivo:** Permitir a la Secretaría de Asuntos Electorales enviar comunicaciones estandarizadas a todos los usuarios.

**Plan de Implementación:**

### A. Base de Datos de Contactos (La "Base de Datos para tales fines")
Para cumplir con el requerimiento de una base de datos automatizada para comunicaciones, crearemos una estructura dedicada que se alimente sola.

1.  **Nueva Tabla:** `comunicaciones_contactos`
    - `id` (uuid)
    - `email` (unique)
    - `nombre`
    - `origen` (ej: 'afiliado', 'padron', 'manual')
    - `fecha_suscripcion`
    - `activo` (boolean)

2.  **Automatización (Trigger de Base de Datos):**
    - Crearemos una función y un trigger en PostgreSQL (`trigger_agregar_contacto_comunicacion`).
    - **Lógica:** Cada vez que se inserte un registro en la tabla `afiliados`:
      - Se dispara el trigger.
      - Copia `email`, `nombre`, `apellidos` a la tabla `comunicaciones_contactos`.
    - Esto garantiza que **nadie** se quede fuera, sin importar desde dónde se registre (app, manual, importación masiva).

### B. Módulo de Gestión (Secretaría de Asuntos Electorales)
Crearemos una interfaz para redactar y enviar los mensajes.

1.  **Nueva Página:** `src/app/admin/comunicaciones/page.tsx`
    - Acceso restringido a Administradores/Secretarios.
    - **Editor:** Campos para Asunto y Mensaje (posiblemente un editor de texto enriquecido simple).
    - **Vista Previa:** Ver cómo quedará el correo antes de enviar.
    - **Botón de Envío Masivo:** Dispara el proceso de envío.

2.  **Backend de Envío Masivo (Batching):**
    - Crear endpoint `src/app/api/emails/broadcast/route.ts`.
    - Leerá los contactos activos de `comunicaciones_contactos`.
    - Utilizará `Resend` para enviar los correos (manejo de límites de tasa y batching).

---

## Próximos Pasos (Inmediatos)
1.  **Aprobación:** Confirmar si está de acuerdo con el uso de **Resend** para los correos.
2.  **Configuración:** Necesitaremos su **API Key de Resend**.
3.  **Ejecución:**
    - Crear tabla y triggers SQL.
    - Instalar dependencias.
    - Crear rutas de API y Pantallas.
