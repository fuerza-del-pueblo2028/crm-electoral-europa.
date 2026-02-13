-- =============================================================================
-- SECURITY HARDENING: RESTRICT RLS TO SELECT-ONLY FOR ANON/PUBLIC
-- =============================================================================
-- 
-- CONTEXT:
-- This CRM uses custom authentication (not Supabase Auth), so the browser
-- client always connects as the 'anon' role. Previously, all tables had
-- fully permissive policies allowing anon to INSERT, UPDATE, and DELETE.
--
-- NOW:
-- All write operations have been migrated to server-side API routes that use
-- the 'service_role' key. The service_role bypasses RLS entirely by default,
-- so it does NOT need explicit policies.
--
-- THIS SCRIPT:
-- 1. Drops ALL existing policies on each table (clean slate)
-- 2. Creates a single SELECT-only policy for anon on each table
-- 3. Ensures RLS is enabled on all tables
--
-- ⚠️  IMPORTANT: Run this ONLY after confirming the API proxy works correctly.
--     Once applied, direct client-side writes will be blocked.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: First, let's see what policies currently exist (for reference)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =============================================================================
-- TABLE: afiliados
-- =============================================================================
ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Acceso Total Publico" ON afiliados;
DROP POLICY IF EXISTS "Lectura publica" ON afiliados;
DROP POLICY IF EXISTS "Escritura autenticada" ON afiliados;
DROP POLICY IF EXISTS "Enable read access for all users" ON afiliados;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON afiliados;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON afiliados;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON afiliados;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON afiliados;
DROP POLICY IF EXISTS "Enable select for anon" ON afiliados;
DROP POLICY IF EXISTS "Enable insert for anon" ON afiliados;
DROP POLICY IF EXISTS "Enable update for anon" ON afiliados;
DROP POLICY IF EXISTS "Enable delete for anon" ON afiliados;
DROP POLICY IF EXISTS "anon_select_only" ON afiliados;

-- Create SELECT-only policy
CREATE POLICY "anon_select_only"
ON afiliados FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: afiliados_historial
-- =============================================================================
ALTER TABLE afiliados_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON afiliados_historial;
DROP POLICY IF EXISTS "Enable insert for all users" ON afiliados_historial;
DROP POLICY IF EXISTS "Enable select for anon" ON afiliados_historial;
DROP POLICY IF EXISTS "Enable insert for anon" ON afiliados_historial;
DROP POLICY IF EXISTS "Enable update for anon" ON afiliados_historial;
DROP POLICY IF EXISTS "Enable delete for anon" ON afiliados_historial;
DROP POLICY IF EXISTS "anon_select_only" ON afiliados_historial;

CREATE POLICY "anon_select_only"
ON afiliados_historial FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: usuarios
-- =============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON usuarios;
DROP POLICY IF EXISTS "Enable insert for all users" ON usuarios;
DROP POLICY IF EXISTS "Enable update for all users" ON usuarios;
DROP POLICY IF EXISTS "Enable delete for all users" ON usuarios;
DROP POLICY IF EXISTS "Enable select for anon" ON usuarios;
DROP POLICY IF EXISTS "Enable insert for anon" ON usuarios;
DROP POLICY IF EXISTS "Enable update for anon" ON usuarios;
DROP POLICY IF EXISTS "Enable delete for anon" ON usuarios;
DROP POLICY IF EXISTS "Acceso Total Publico" ON usuarios;
DROP POLICY IF EXISTS "anon_select_only" ON usuarios;

CREATE POLICY "anon_select_only"
ON usuarios FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: documentos
-- =============================================================================
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON documentos;
DROP POLICY IF EXISTS "Enable insert for all users" ON documentos;
DROP POLICY IF EXISTS "Enable update for all users" ON documentos;
DROP POLICY IF EXISTS "Enable delete for all users" ON documentos;
DROP POLICY IF EXISTS "Enable select for anon" ON documentos;
DROP POLICY IF EXISTS "Enable insert for anon" ON documentos;
DROP POLICY IF EXISTS "Enable update for anon" ON documentos;
DROP POLICY IF EXISTS "Enable delete for anon" ON documentos;
DROP POLICY IF EXISTS "Permitir todo para documentos" ON documentos;
DROP POLICY IF EXISTS "anon_select_only" ON documentos;

CREATE POLICY "anon_select_only"
ON documentos FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: actas_electorales
-- =============================================================================
ALTER TABLE actas_electorales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON actas_electorales;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON actas_electorales;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON actas_electorales;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON actas_electorales;
DROP POLICY IF EXISTS "Enable all access for anon" ON actas_electorales;
DROP POLICY IF EXISTS "Enable select for anon" ON actas_electorales;
DROP POLICY IF EXISTS "Enable insert for anon" ON actas_electorales;
DROP POLICY IF EXISTS "Enable update for anon" ON actas_electorales;
DROP POLICY IF EXISTS "Enable delete for anon" ON actas_electorales;
DROP POLICY IF EXISTS "anon_select_only" ON actas_electorales;

CREATE POLICY "anon_select_only"
ON actas_electorales FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: estatutos
-- =============================================================================
ALTER TABLE estatutos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON estatutos;
DROP POLICY IF EXISTS "Enable insert for all users" ON estatutos;
DROP POLICY IF EXISTS "Enable update for all users" ON estatutos;
DROP POLICY IF EXISTS "Enable delete for all users" ON estatutos;
DROP POLICY IF EXISTS "Enable select for anon" ON estatutos;
DROP POLICY IF EXISTS "Enable insert for anon" ON estatutos;
DROP POLICY IF EXISTS "Enable update for anon" ON estatutos;
DROP POLICY IF EXISTS "Enable delete for anon" ON estatutos;
DROP POLICY IF EXISTS "anon_select_only" ON estatutos;

CREATE POLICY "anon_select_only"
ON estatutos FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: elecciones_cargos
-- =============================================================================
ALTER TABLE elecciones_cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable insert for all users" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable update for all users" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable delete for all users" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable select for anon" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable insert for anon" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable update for anon" ON elecciones_cargos;
DROP POLICY IF EXISTS "Enable delete for anon" ON elecciones_cargos;
DROP POLICY IF EXISTS "anon_select_only" ON elecciones_cargos;

CREATE POLICY "anon_select_only"
ON elecciones_cargos FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: elecciones_candidatos
-- =============================================================================
ALTER TABLE elecciones_candidatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable insert for all users" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable update for all users" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable delete for all users" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable select for anon" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable insert for anon" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable update for anon" ON elecciones_candidatos;
DROP POLICY IF EXISTS "Enable delete for anon" ON elecciones_candidatos;
DROP POLICY IF EXISTS "anon_select_only" ON elecciones_candidatos;

CREATE POLICY "anon_select_only"
ON elecciones_candidatos FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: elecciones_padron
-- =============================================================================
ALTER TABLE elecciones_padron ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable insert for all users" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable update for all users" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable delete for all users" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable select for anon" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable insert for anon" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable update for anon" ON elecciones_padron;
DROP POLICY IF EXISTS "Enable delete for anon" ON elecciones_padron;
DROP POLICY IF EXISTS "anon_select_only" ON elecciones_padron;

CREATE POLICY "anon_select_only"
ON elecciones_padron FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: elecciones_votos_emitidos
-- =============================================================================
ALTER TABLE elecciones_votos_emitidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable insert for all users" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable update for all users" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable delete for all users" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable select for anon" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable insert for anon" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable update for anon" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "Enable delete for anon" ON elecciones_votos_emitidos;
DROP POLICY IF EXISTS "anon_select_only" ON elecciones_votos_emitidos;

CREATE POLICY "anon_select_only"
ON elecciones_votos_emitidos FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: europa_presidentes_dm
-- =============================================================================
ALTER TABLE europa_presidentes_dm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de presidentes" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Permitir actualización autenticada de presidentes" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable read access for all users" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable insert for all users" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable update for all users" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable delete for all users" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable select for anon" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable insert for anon" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable update for anon" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "Enable delete for anon" ON europa_presidentes_dm;
DROP POLICY IF EXISTS "anon_select_only" ON europa_presidentes_dm;

CREATE POLICY "anon_select_only"
ON europa_presidentes_dm FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: europa_recintos_electorales
-- =============================================================================
ALTER TABLE europa_recintos_electorales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de recintos" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Permitir actualización autenticada de recintos" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable read access for all users" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable insert for all users" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable update for all users" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable delete for all users" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable select for anon" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable insert for anon" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable update for anon" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "Enable delete for anon" ON europa_recintos_electorales;
DROP POLICY IF EXISTS "anon_select_only" ON europa_recintos_electorales;

CREATE POLICY "anon_select_only"
ON europa_recintos_electorales FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: comunicaciones
-- =============================================================================
ALTER TABLE comunicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON comunicaciones;
DROP POLICY IF EXISTS "Enable insert for all users" ON comunicaciones;
DROP POLICY IF EXISTS "Enable update for all users" ON comunicaciones;
DROP POLICY IF EXISTS "Enable delete for all users" ON comunicaciones;
DROP POLICY IF EXISTS "Enable select for anon" ON comunicaciones;
DROP POLICY IF EXISTS "Enable insert for anon" ON comunicaciones;
DROP POLICY IF EXISTS "Enable update for anon" ON comunicaciones;
DROP POLICY IF EXISTS "Enable delete for anon" ON comunicaciones;
DROP POLICY IF EXISTS "anon_select_only" ON comunicaciones;

CREATE POLICY "anon_select_only"
ON comunicaciones FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- TABLE: comunicaciones_contactos
-- =============================================================================
ALTER TABLE comunicaciones_contactos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable insert for all users" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable update for all users" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable delete for all users" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable select for anon" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable insert for anon" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable update for anon" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "Enable delete for anon" ON comunicaciones_contactos;
DROP POLICY IF EXISTS "anon_select_only" ON comunicaciones_contactos;

CREATE POLICY "anon_select_only"
ON comunicaciones_contactos FOR SELECT
TO anon
USING (true);

-- =============================================================================
-- VERIFICATION: List all active policies to confirm
-- =============================================================================
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
