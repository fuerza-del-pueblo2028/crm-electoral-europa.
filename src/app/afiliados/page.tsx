
"use client";

import { useState, useEffect, useCallback } from "react";
import { SECCIONALES, Affiliate } from "@/lib/mockData";
import { Search, Filter, CheckCircle, XCircle, Loader2, Plus, Download, Upload, Calendar, LayoutDashboard, FileSearch, Eye, MapPin } from "lucide-react";
import { AffiliateModal } from "@/components/AffiliateModal";
import { NewAffiliateModal } from "@/components/NewAffiliateModal";
import { ImportAffiliatesModal } from "@/components/ImportAffiliatesModal";
import { supabase } from "@/lib/supabase";
import ExcelJS from 'exceljs';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function AffiliatesPage() {
    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay to avoid slamming DB
    const [selectedSeccional, setSelectedSeccional] = useState("Todas");
    const [selectedRole, setSelectedRole] = useState("Todos");
    const [selectedStatus, setSelectedStatus] = useState("Todos");
    const [sortOrder, setSortOrder] = useState("newest");

    // Date Filter States
    const [dateFilter, setDateFilter] = useState("todos"); // todos, 7days, 30days, 90days, custom
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // UI/Data States
    const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [canManage, setCanManage] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userSeccional, setUserSeccional] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        const role = localStorage.getItem("user_role");
        const seccional = localStorage.getItem("user_seccional");

        if (!token) {
            window.location.href = "/login";
            return;
        }

        setUserRole(role);
        setUserSeccional(seccional);

        const isManager = role === "administrador" || role === "operador" || role === "admin" || role === "Admin";
        setCanManage(isManager);

        // Si es operador, forzar la seccional asignada
        if (role === "operador" && seccional) {
            setSelectedSeccional(seccional);
        }

        setIsMounted(true);
    }, []);

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Reset page to 1 only when filters change (not when page changes)
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, selectedSeccional, selectedRole, selectedStatus, sortOrder, dateFilter, customStartDate, customEndDate]);

    const fetchAffiliates = useCallback(async () => {
        if (!isMounted) return;
        setLoading(true);

        try {
            // Start building the query
            let query = supabase
                .from('afiliados')
                .select('*', { count: 'exact' });

            // 1. Apply Filters
            if (debouncedSearchTerm) {
                // Normalize search term to remove accents (José → jose)
                // This matches the normalized columns nombre_search and apellidos_search
                const normalizedTerm = debouncedSearchTerm
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();

                const term = `%${normalizedTerm}%`;

                query = query.or(
                    `nombre_search.like.${term},` +
                    `apellidos_search.like.${term},` +
                    `cedula.ilike.${term}`
                );
            }

            if (selectedSeccional !== "Todas") {
                query = query.eq('seccional', selectedSeccional);
            } else if (userRole === "operador" && userSeccional) {
                // Filtro de seguridad: si es operador y no hay seccional seleccionada (o es "Todas"),
                // forzar su seccional asignada.
                query = query.eq('seccional', userSeccional);
            }

            if (selectedRole !== "Todos") {
                query = query.eq('role', selectedRole);
            }

            if (selectedStatus !== "Todos") {
                query = query.eq('validado', selectedStatus === "Validado");
            }

            // Date Filter
            if (dateFilter !== "todos") {
                const now = new Date();
                let startDate: Date | null = null;

                switch (dateFilter) {
                    case "7days":
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        query = query.gte('created_at', startDate.toISOString());
                        break;
                    case "30days":
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        query = query.gte('created_at', startDate.toISOString());
                        break;
                    case "90days":
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        query = query.gte('created_at', startDate.toISOString());
                        break;
                    case "custom":
                        if (customStartDate) {
                            const start = new Date(customStartDate);
                            start.setHours(0, 0, 0, 0);
                            query = query.gte('created_at', start.toISOString());
                        }
                        if (customEndDate) {
                            const end = new Date(customEndDate);
                            end.setHours(23, 59, 59, 999);
                            query = query.lte('created_at', end.toISOString());
                        }
                        break;
                }
            }

            // 2. Apply Sorting
            switch (sortOrder) {
                case "newest":
                    query = query.order('created_at', { ascending: false });
                    break;
                case "oldest":
                    query = query.order('created_at', { ascending: true });
                    break;
                case "a-z":
                    query = query.order('nombre', { ascending: true });
                    break;
                case "z-a":
                    query = query.order('nombre', { ascending: false });
                    break;
                default:
                    query = query.order('created_at', { ascending: false });
            }

            // 3. Apply Pagination (Range is 0-indexed)
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            query = query.range(from, to);

            // Execute
            const { data, error, count } = await query;

            if (error) throw error;

            if (data) {
                const mappedData: Affiliate[] = data.map(item => ({
                    id: item.id,
                    name: item.nombre,
                    lastName: item.apellidos,
                    cedula: item.cedula,
                    seccional: item.seccional,
                    validated: item.validado,
                    role: item.role as any,
                    email: item.email || '',
                    foto_url: item.foto_url,
                    fecha_nacimiento: item.fecha_nacimiento,
                    telefono: item.telefono,
                    cargo_organizacional: item.cargo_organizacional
                }));
                setAffiliates(mappedData);
                setTotalItems(count || 0);
            }
        } catch (error) {
            console.error("Error loading affiliates:", error);
        } finally {
            setLoading(true); // Small delay for UX feel, actually should be false
            setTimeout(() => setLoading(false), 300);
        }
    }, [isMounted, debouncedSearchTerm, selectedSeccional, selectedRole, selectedStatus, sortOrder, currentPage, dateFilter, customStartDate, customEndDate]);

    // Función de exportación a Excel
    const exportToExcel = async () => {
        try {
            // Obtener TODOS los afiliados con los filtros aplicados (sin paginación)
            let query = supabase
                .from('afiliados')
                .select('*');

            // Aplicar los mismos filtros que en la vista
            if (debouncedSearchTerm) {
                const term = `%${debouncedSearchTerm}%`;
                query = query.or(`nombre.ilike.${term},apellidos.ilike.${term},cedula.ilike.${term}`);
            }
            if (selectedSeccional !== "Todas") {
                query = query.eq('seccional', selectedSeccional);
            } else if (userRole === "operador" && userSeccional) {
                query = query.eq('seccional', userSeccional);
            }
            if (selectedRole !== "Todos") {
                query = query.eq('role', selectedRole);
            }
            if (selectedStatus !== "Todos") {
                query = query.eq('validado', selectedStatus === "Validado");
            }

            // Aplicar ordenamiento
            switch (sortOrder) {
                case "newest":
                    query = query.order('created_at', { ascending: false });
                    break;
                case "oldest":
                    query = query.order('created_at', { ascending: true });
                    break;
                case "a-z":
                    query = query.order('nombre', { ascending: true });
                    break;
                case "z-a":
                    query = query.order('nombre', { ascending: false });
                    break;
            }

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                alert('No hay datos para exportar con los filtros aplicados');
                return;
            }

            // Preparar datos para Excel
            const excelData = data.map((item, index) => ({
                'N°': index + 1,
                'Nombre': item.nombre,
                'Apellidos': item.apellidos,
                'Cédula': item.cedula,
                'Fecha Nacimiento': item.fecha_nacimiento || 'N/A',
                'Email': item.email || 'N/A',
                'Teléfono': item.telefono || 'N/A',
                'Seccional': item.seccional,
                'Cargo Organizacional': item.cargo_organizacional || 'N/A',
                'Role Sistema': item.role,
                'Estado': item.validado ? 'Validado' : 'Pendiente',
                'Fecha Registro': new Date(item.created_at).toLocaleDateString('es-ES')
            }));

            // Crear libro de Excel con ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Afiliados');

            // Definir columnas con anchos
            worksheet.columns = [
                { header: 'N°', key: 'num', width: 5 },
                { header: 'Nombre', key: 'nombre', width: 15 },
                { header: 'Apellidos', key: 'apellidos', width: 15 },
                { header: 'Cédula', key: 'cedula', width: 15 },
                { header: 'Fecha Nacimiento', key: 'fecha_nac', width: 15 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Teléfono', key: 'telefono', width: 15 },
                { header: 'Seccional', key: 'seccional', width: 12 },
                { header: 'Cargo Organizacional', key: 'cargo', width: 20 },
                { header: 'Role Sistema', key: 'role', width: 12 },
                { header: 'Estado', key: 'estado', width: 10 },
                { header: 'Fecha Registro', key: 'fecha_reg', width: 12 }
            ];

            // Añadir filas
            excelData.forEach(row => {
                worksheet.addRow({
                    num: row['N°'],
                    nombre: row['Nombre'],
                    apellidos: row['Apellidos'],
                    cedula: row['Cédula'],
                    fecha_nac: row['Fecha Nacimiento'],
                    email: row['Email'],
                    telefono: row['Teléfono'],
                    seccional: row['Seccional'],
                    cargo: row['Cargo Organizacional'],
                    role: row['Role Sistema'],
                    estado: row['Estado'],
                    fecha_reg: row['Fecha Registro']
                });
            });

            // Estilo del header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF005C2B' }
            };
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Generar nombre de archivo
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `Afiliados_FP_Europa_${timestamp}.xlsx`;

            // Descargar - generar buffer y crear blob para descarga
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            window.URL.revokeObjectURL(url);

            alert(`✅ Exportación exitosa: ${data.length} afiliados exportados`);
        } catch (error) {
            console.error('Error exportando:', error);
            alert('Error al exportar los datos');
        }
    };

    // Trigger fetch when parameters change
    useEffect(() => {
        fetchAffiliates();
    }, [fetchAffiliates]);

    if (!isMounted) return null;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startRecord = (currentPage - 1) * itemsPerPage + 1;
    const endRecord = Math.min(startRecord + itemsPerPage - 1, totalItems);

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#005c2b]">Afiliados</h1>
                        <p className="text-gray-500 italic">Gestión del padrón electoral Europa</p>
                    </div>

                    {canManage && (
                        <div className="hidden lg:flex items-center gap-2 ml-4">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs uppercase tracking-wider"
                            >
                                <Upload size={14} />
                                Importar
                            </button>
                            <button
                                onClick={() => setIsNewModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-fp-green text-white rounded-xl hover:bg-fp-green-dark transition-all font-bold text-xs uppercase tracking-wider shadow-sm"
                            >
                                <Plus size={14} />
                                Nuevo Afiliado
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                    {/* View Toggle Switch */}
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-fp-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Vista Cuadrícula"
                        >
                            <LayoutDashboard size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-fp-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Vista Lista"
                        >
                            <FileSearch size={18} />
                        </button>
                    </div>

                    {/* Seccional Filter */}
                    <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                        {userRole === "operador" ? (
                            <div className="px-4 py-1.5 rounded-lg bg-white text-fp-green shadow-sm text-xs font-bold border border-gray-100 flex items-center gap-2">
                                <MapPin size={12} />
                                {userSeccional}
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setSelectedSeccional("Todas")}
                                    className={`px-4 py-1.5 rounded-lg transition-all text-xs font-bold ${selectedSeccional === "Todas" ? 'bg-white text-fp-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Todas
                                </button>
                                {SECCIONALES.map(sec => (
                                    <button
                                        key={sec}
                                        onClick={() => setSelectedSeccional(sec)}
                                        className={`px-4 py-1.5 rounded-lg transition-all text-xs font-bold whitespace-nowrap ${selectedSeccional === sec ? 'bg-white text-fp-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {sec}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-fp-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-10 pr-4 py-2.5 border border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green w-full sm:w-48 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm flex flex-wrap gap-2 items-center">
                <div className="flex gap-2 w-full overflow-x-auto pb-1">
                    {/* Role Filter */}
                    <div className="min-w-[140px]">
                        <select
                            className="w-full pl-4 pr-8 py-2 border border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green appearance-none shadow-sm font-bold text-gray-700 text-[10px] uppercase tracking-wider"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="Todos">Rol: Todos</option>
                            <option value="Miembro">Miembro</option>
                            <option value="Miembro DC">Miembro DC</option>
                            <option value="Presidente DM">Presidente DM</option>
                            <option value="Presidente DB">Presidente DB</option>
                            <option value="Operador">Operador</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="min-w-[140px]">
                        <select
                            className="w-full pl-4 pr-8 py-2 border border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green appearance-none shadow-sm font-bold text-gray-700 text-[10px] uppercase tracking-wider"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="Todos">Estado: Todos</option>
                            <option value="Validado">Validado</option>
                            <option value="Pendiente">Pendiente</option>
                        </select>
                    </div>

                    {/* Seccional Filter */}
                    <div className="relative min-w-[160px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green appearance-none shadow-sm font-bold text-gray-700 text-[10px] uppercase tracking-wider"
                            value={selectedSeccional}
                            onChange={(e) => setSelectedSeccional(e.target.value)}
                        >
                            <option value="Todas">Seccional: Todas</option>
                            {SECCIONALES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="relative min-w-[170px]">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                        <select
                            className="w-full pl-9 pr-8 py-2 border border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green appearance-none shadow-sm font-bold text-gray-700 text-[10px] uppercase tracking-wider"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="todos">Cualquier Fecha</option>
                            <option value="7days">Últimos 7 días</option>
                            <option value="30days">Últimos 30 días</option>
                            <option value="90days">Últimos 90 días</option>
                            <option value="custom">Rango Personalizado</option>
                        </select>
                    </div>

                    {/* Custom Date Range Inputs */}
                    <div className={`flex bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm items-center transition-all duration-300 ${dateFilter === 'custom' ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden pointer-events-none'}`}>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="px-3 py-1 border-r border-gray-100 text-[10px] focus:outline-none focus:bg-green-50 text-gray-600 font-bold"
                            title="Fecha Inicio"
                        />
                        <span className="px-2 text-gray-400 text-[10px]">→</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="px-3 py-1 text-[10px] focus:outline-none focus:bg-green-50 text-gray-600 font-bold"
                            title="Fecha Fin"
                        />
                    </div>

                    {/* Sort Filter */}
                    <div className="min-w-[140px]">
                        <select
                            className="w-full pl-4 pr-8 py-2 border border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green appearance-none shadow-sm font-bold text-gray-700 text-[10px] uppercase tracking-wider"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="newest">Más Recientes</option>
                            <option value="oldest">Más Antiguos</option>
                            <option value="a-z">Nombre (A-Z)</option>
                            <option value="z-a">Nombre (Z-A)</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center py-40 space-y-4">
                    <Loader2 className="animate-spin text-fp-green" size={48} />
                    <span className="text-gray-400 font-black uppercase tracking-widest text-xs">Sincronizando Padrón...</span>
                </div>
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {affiliates.map(affiliate => (
                                <button
                                    key={affiliate.id}
                                    onClick={() => setSelectedAffiliate(affiliate)}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 hover:shadow-xl hover:border-fp-green transition-all text-left group flex flex-col items-center space-y-4 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-fp-green/5 -mr-8 -mt-8 rounded-full group-hover:bg-fp-green/10 transition-colors"></div>

                                    <div className="w-24 h-24 rounded-full bg-gray-50 overflow-hidden border-2 border-white shadow-md group-hover:border-fp-green transition-all flex items-center justify-center">
                                        <img
                                            src={affiliate.foto_url || "/foto_perfil_afiliados.png"}
                                            alt={affiliate.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="text-center w-full space-y-1">
                                        <h3 className="font-black text-gray-900 group-hover:text-fp-green uppercase italic tracking-tighter truncate leading-none">
                                            {affiliate.name} {affiliate.lastName}
                                        </h3>
                                        <p className="text-[10px] text-gray-400 font-mono tracking-widest">{affiliate.cedula}</p>
                                    </div>
                                    <div className="w-full pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-gray-400">{affiliate.seccional}</span>
                                        {affiliate.validated ? (
                                            <div className="flex items-center text-green-600 space-x-1">
                                                <CheckCircle size={14} />
                                                <span>Validado</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-orange-400 space-x-1">
                                                <XCircle size={14} />
                                                <span>Pendiente</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Afiliado</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cédula</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Seccional</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Rol</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {affiliates.map(affiliate => (
                                            <tr
                                                key={affiliate.id}
                                                onClick={() => setSelectedAffiliate(affiliate)}
                                                className="hover:bg-green-50/30 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 group-hover:border-fp-green transition-all shadow-sm">
                                                            <img
                                                                src={affiliate.foto_url || "/foto_perfil_afiliados.png"}
                                                                alt={affiliate.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-gray-900 uppercase italic tracking-tighter text-sm group-hover:text-fp-green transition-colors">
                                                                {affiliate.name} {affiliate.lastName}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-mono">{affiliate.email || 'Sin correo'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono text-gray-500">{affiliate.cedula}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{affiliate.seccional}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-fp-green bg-fp-green/5 px-2 py-1 rounded-lg">
                                                        {affiliate.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {affiliate.validated ? (
                                                        <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-green-600">
                                                            <CheckCircle size={12} className="mr-1" /> Validado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-orange-400">
                                                            <XCircle size={12} className="mr-1" /> Pendiente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-fp-green hover:scale-110 transition-transform">
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {affiliates.length === 0 ? (
                        <div className="py-24 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                <Search size={32} className="text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">
                                No se encontraron resultados en el padrón
                            </p>
                        </div>
                    ) : (
                        /* Controles de Paginación */
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-50 shadow-sm gap-4">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Mostrando {startRecord} - {endRecord} de {totalItems}
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="px-4 py-2 border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    Anterior
                                </button>

                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && currentPage > 3) {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        if (pageNum > totalPages) return null;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === pageNum
                                                    ? "bg-fp-green text-white shadow-lg shadow-green-900/20 scale-110"
                                                    : "text-gray-400 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="px-4 py-2 border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <AffiliateModal
                isOpen={!!selectedAffiliate}
                onClose={() => setSelectedAffiliate(null)}
                affiliate={selectedAffiliate}
                onDelete={() => {
                    // Force refresh
                    fetchAffiliates();
                    setSelectedAffiliate(null);
                }}
            />

            <NewAffiliateModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onSuccess={() => fetchAffiliates()}
            />

            <ImportAffiliatesModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => fetchAffiliates()}
            />
        </div>
    );
}
