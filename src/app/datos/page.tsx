"use client";

import { useState, useEffect } from "react";
import { BarChart3, ChevronRight, MapPin, Download, Home, ArrowLeft, Users, Building2, School, TrendingUp, PieChart as PieChartIcon, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dbDelete } from "@/lib/dbWrite";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line,
    AreaChart,
    Area
} from "recharts";

type ViewLevel = "seccionales" | "ciudades" | "recintos" | "colegios";
type Tab = "resultados" | "padron";

export default function DatosElectorales() {
    const [isMounted, setIsMounted] = useState(false);
    const [allActas, setAllActas] = useState<any[]>([]);
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>("resultados");

    // View state for Actas
    const [currentLevel, setCurrentLevel] = useState<ViewLevel>("seccionales");
    const [selection, setSelection] = useState({
        seccional: "",
        ciudad: "",
        recinto: ""
    });

    const seccionales = ["Madrid", "Barcelona", "Milano", "Zurich", "Holanda", "Valencia"];
    const COLORS = ["#00843D", "#0051B5", "#7B2CBF", "#64748B", "#EF4444", "#F59E0B"];

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (!token) {
            window.location.href = "/login";
            return;
        }
        setIsMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        // Fetch Actas
        const { data: actasData } = await supabase
            .from('actas_electorales')
            .select('*');
        if (actasData) setAllActas(actasData);

        // Fetch Affiliates for stats
        const { data: affData } = await supabase
            .from('afiliados')
            .select('id, created_at, seccional, validado, role');
        if (affData) setAffiliates(affData);
    };

    if (!isMounted) return null;

    // --- LOGIC FOR ACTAS (RESULTADOS) ---
    const filteredActas = allActas.filter(acta => {
        if (currentLevel === "seccionales") return true;
        if (currentLevel === "ciudades") return acta.seccional === selection.seccional;
        if (currentLevel === "recintos") return acta.seccional === selection.seccional && acta.ciudad === selection.ciudad;
        if (currentLevel === "colegios") return acta.seccional === selection.seccional && acta.ciudad === selection.ciudad && acta.recinto === selection.recinto;
        return true;
    });

    const stats = {
        fp: filteredActas.reduce((acc, curr) => acc + (curr.votos_fp || 0), 0),
        prm: filteredActas.reduce((acc, curr) => acc + (curr.votos_prm || 0), 0),
        pld: filteredActas.reduce((acc, curr) => acc + (curr.votos_pld || 0), 0),
        otros: filteredActas.reduce((acc, curr) => acc + (curr.votos_otros || 0), 0),
        nulos: filteredActas.reduce((acc, curr) => acc + (curr.votos_nulos || 0), 0),
    };

    const votesChartData = [
        { name: "FP", votos: stats.fp, color: "#00843D" },
        { name: "PRM", votos: stats.prm, color: "#0051B5" },
        { name: "PLD", votos: stats.pld, color: "#7B2CBF" },
        { name: "Otros", votos: stats.otros, color: "#64748B" },
        { name: "Nulos", votos: stats.nulos, color: "#EF4444" },
    ];

    const handleSeccionalClick = (sec: string) => {
        setSelection({ ...selection, seccional: sec });
        setCurrentLevel("ciudades");
    };

    const handleCiudadClick = (ciudad: string) => {
        setSelection({ ...selection, ciudad: ciudad });
        setCurrentLevel("recintos");
    };

    const handleRecintoClick = (recinto: string) => {
        setSelection({ ...selection, recinto: recinto });
        setCurrentLevel("colegios");
    };

    const goBack = () => {
        if (currentLevel === "colegios") setCurrentLevel("recintos");
        else if (currentLevel === "recintos") setCurrentLevel("ciudades");
        else if (currentLevel === "ciudades") setCurrentLevel("seccionales");
    };

    const getSubItems = () => {
        if (currentLevel === "seccionales") return seccionales;
        if (currentLevel === "ciudades") return [...new Set(filteredActas.map(a => a.ciudad))];
        if (currentLevel === "recintos") return [...new Set(filteredActas.map(a => a.recinto))];
        return [];
    };

    const handleDelete = async (type: 'ciudad' | 'recinto' | 'colegio' | 'acta', value: string, actaId?: string) => {
        let confirmMessage = "";
        let deleteCondition: any = {};

        if (type === 'ciudad') {
            const affectedActas = allActas.filter(a => a.seccional === selection.seccional && a.ciudad === value);
            confirmMessage = `¿Eliminar la ciudad "${value}" y todas sus ${affectedActas.length} actas asociadas?`;
            deleteCondition = { seccional: selection.seccional, ciudad: value };
        } else if (type === 'recinto') {
            const affectedActas = allActas.filter(a => a.seccional === selection.seccional && a.ciudad === selection.ciudad && a.recinto === value);
            confirmMessage = `¿Eliminar el recinto "${value}" y todas sus ${affectedActas.length} actas asociadas?`;
            deleteCondition = { seccional: selection.seccional, ciudad: selection.ciudad, recinto: value };
        } else if (type === 'colegio') {
            const affectedActas = allActas.filter(a => a.seccional === selection.seccional && a.ciudad === selection.ciudad && a.recinto === selection.recinto && a.colegio === value);
            confirmMessage = `¿Eliminar el colegio "${value}" y todas sus ${affectedActas.length} actas asociadas?`;
            deleteCondition = { seccional: selection.seccional, ciudad: selection.ciudad, recinto: selection.recinto, colegio: value };
        } else if (type === 'acta' && actaId) {
            confirmMessage = `¿Eliminar esta acta?`;
            deleteCondition = { id: actaId };
        }

        if (!confirm(confirmMessage)) return;

        try {
            const result = await dbDelete('actas_electorales', deleteCondition);

            if (!result.success) throw new Error(result.error);

            alert(`Eliminación exitosa`);
            await fetchData(); // Reload data
        } catch (error: any) {
            alert(`Error al eliminar: ${error.message}`);
        }
    };

    // --- LOGIC FOR AFFILIATES (PADRON) ---
    // 1. Distribution by Seccional
    const affiliatesBySeccional = affiliates.reduce((acc: any, curr) => {
        acc[curr.seccional] = (acc[curr.seccional] || 0) + 1;
        return acc;
    }, {});

    const seccionalChartData = Object.keys(affiliatesBySeccional).map(key => ({
        name: key,
        value: affiliatesBySeccional[key]
    })).sort((a, b) => b.value - a.value);

    // 2. Validation Status
    const validatedCount = affiliates.filter(a => a.validado).length;
    const pendingCount = affiliates.length - validatedCount;
    const validationData = [
        { name: "Validado", value: validatedCount, color: "#00843D" },
        { name: "Pendiente", value: pendingCount, color: "#F59E0B" }
    ];

    // 3. Growth Over Time (Mocking monthly data if created_at is strictly recent or sparse)
    // Group by month YYYY-MM
    const growthMap = affiliates.reduce((acc: any, curr) => {
        const date = new Date(curr.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    // Sort chronologically and build cumulative
    let cumulative = 0;
    const growthChartData = Object.keys(growthMap).sort().map(key => {
        cumulative += growthMap[key];
        return {
            date: key,
            nuevos: growthMap[key],
            total: cumulative
        };
    });


    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#005c2b] flex items-center">
                        <BarChart3 size={32} className="mr-3" /> Dashboard Electoral
                    </h1>
                    <p className="text-gray-500 italic mt-1">Análisis en tiempo real de votaciones y padrón</p>
                </div>

                {/* Tab Navigation logic would go here if we want top-level tabs specifically */}
            </div>

            {/* Main Tabs */}
            <div className="bg-white p-1 rounded-xl inline-flex shadow-sm border border-gray-100">
                <button
                    onClick={() => setActiveTab("resultados")}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === "resultados"
                        ? "bg-[#00843D] text-white shadow-md"
                        : "text-gray-500 hover:bg-gray-50"
                        }`}
                >
                    <BarChart3 size={16} className="mr-2" /> Resultados Votaciones
                </button>
                <button
                    onClick={() => setActiveTab("padron")}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === "padron"
                        ? "bg-[#00843D] text-white shadow-md"
                        : "text-gray-500 hover:bg-gray-50"
                        }`}
                >
                    <Users size={16} className="mr-2" /> Estadísticas del Padrón
                </button>
            </div>


            {activeTab === "resultados" ? (
                /* --- VISTA DE RESULTADOS (ACTAS) --- */
                <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">

                    {/* Breadcrumbs for Navigation */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center text-xs text-gray-400 font-medium">
                            <button onClick={() => {
                                setCurrentLevel("seccionales");
                                setSelection({ seccional: "", ciudad: "", recinto: "" });
                            }} className="hover:text-[#00843D] flex items-center">
                                <Home size={14} className="mr-1" /> EUROPA
                            </button>
                            {selection.seccional && (
                                <>
                                    <ChevronRight size={14} className="mx-1" />
                                    <button onClick={() => {
                                        setCurrentLevel("ciudades");
                                        setSelection({ ...selection, ciudad: "", recinto: "" });
                                    }} className="hover:text-[#00843D] uppercase font-bold text-gray-600">
                                        {selection.seccional}
                                    </button>
                                </>
                            )}
                            {selection.ciudad && currentLevel !== "ciudades" && (
                                <>
                                    <ChevronRight size={14} className="mx-1" />
                                    <button onClick={() => {
                                        setCurrentLevel("recintos");
                                        setSelection({ ...selection, recinto: "" });
                                    }} className="hover:text-[#00843D] uppercase font-bold text-gray-600">
                                        {selection.ciudad}
                                    </button>
                                </>
                            )}
                            {selection.recinto && currentLevel === "colegios" && (
                                <>
                                    <ChevronRight size={14} className="mx-1" />
                                    <span className="text-[#00843D] uppercase font-bold">{selection.recinto}</span>
                                </>
                            )}
                        </div>

                        {currentLevel !== "seccionales" && (
                            <button
                                onClick={goBack}
                                className="flex items-center text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <ArrowLeft size={14} className="mr-1" /> Volver
                            </button>
                        )}
                    </div>

                    {/* Stats Cards Overlay */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {votesChartData.map((d, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white to-gray-50 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 z-10 relative">{d.name}</p>
                                <p className={`text-2xl font-black z-10 relative`} style={{ color: d.color }}>{d.votos.toLocaleString()}</p>
                                <div className="w-full bg-gray-100 h-1.5 mt-3 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${(d.votos / (Object.values(stats).reduce((a, b) => a + b, 0) || 1)) * 100}%`,
                                            backgroundColor: d.color
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Interactive Navigation */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[500px]">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                                    {currentLevel === "seccionales" && <><MapPin className="mr-2 text-green-600" /> Selecciona una Seccional</>}
                                    {currentLevel === "ciudades" && <><Building2 className="mr-2 text-blue-600" /> Ciudades en {selection.seccional}</>}
                                    {currentLevel === "recintos" && <><School className="mr-2 text-purple-600" /> Recintos en {selection.ciudad}</>}
                                    {currentLevel === "colegios" && <><Users className="mr-2 text-orange-600" /> Colegios en {selection.recinto}</>}
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {currentLevel !== "colegios" ? (
                                        getSubItems().map((item, idx) => (
                                            <div key={idx} className="relative group/card">
                                                <button
                                                    onClick={() => {
                                                        if (currentLevel === "seccionales") handleSeccionalClick(item);
                                                        else if (currentLevel === "ciudades") handleCiudadClick(item);
                                                        else if (currentLevel === "recintos") handleRecintoClick(item);
                                                    }}
                                                    className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-[#00843D] hover:text-white rounded-2xl border border-gray-100 transition-all group text-left shadow-sm hover:shadow-lg hover:shadow-green-900/20"
                                                >
                                                    <div>
                                                        <p className="font-bold text-lg uppercase tracking-tight">{item}</p>
                                                        <p className="text-[10px] text-gray-400 group-hover:text-green-100 uppercase tracking-widest font-medium mt-1">
                                                            {allActas.filter(a =>
                                                                (currentLevel === "seccionales" && a.seccional === item) ||
                                                                (currentLevel === "ciudades" && a.seccional === selection.seccional && a.ciudad === item) ||
                                                                (currentLevel === "recintos" && a.seccional === selection.seccional && a.ciudad === selection.ciudad && a.recinto === item)
                                                            ).length} actas
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={20} className="text-gray-300 group-hover:text-white transform group-hover:translate-x-1 transition-transform" />
                                                </button>
                                                {currentLevel !== "seccionales" && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (currentLevel === "ciudades") handleDelete('ciudad', item);
                                                            else if (currentLevel === "recintos") handleDelete('recinto', item);
                                                        }}
                                                        className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all shadow-md z-10"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full space-y-4">
                                            {filteredActas.map((acta, idx) => (
                                                <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4 hover:border-fp-green/30 transition-colors group/acta">
                                                    <div>
                                                        <p className="font-bold text-lg text-gray-800">Colegio {acta.colegio}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-1 rounded uppercase tracking-widest">FP: {acta.votos_fp}</span>
                                                            <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-1 rounded uppercase tracking-widest">PRM: {acta.votos_prm}</span>
                                                            <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-1 rounded uppercase tracking-widest">PLD: {acta.votos_pld}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={acta.archivo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center text-xs bg-[#00843D] text-white px-4 py-3 rounded-xl font-bold hover:bg-[#137228] transition-all shadow-md group whitespace-nowrap"
                                                        >
                                                            <Download size={14} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> VER ACTA
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete('acta', '', acta.id)}
                                                            className="flex items-center text-xs bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-600 transition-all shadow-md opacity-0 group-hover/acta:opacity-100"
                                                            title="Eliminar Acta"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredActas.length === 0 && (
                                                <div className="text-center py-20 text-gray-300">
                                                    <MapPin size={48} className="mx-auto mb-4 opacity-20" />
                                                    <p className="font-bold uppercase tracking-widest text-xs">No hay actas registradas aquí</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chart Visualization */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-sm font-black text-[#005c2b] mb-6 flex items-center uppercase tracking-widest">
                                    <PieChartIcon size={16} className="mr-2" /> Distribución %
                                </h3>
                                <div className="h-[250px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={votesChartData.filter(d => d.votos > 0)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="votos"
                                            >
                                                {votesChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text Overly */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                                        <p className="text-2xl font-black text-gray-800">
                                            {((stats.fp / (Object.values(stats).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(0)}%
                                        </p>
                                        <p className="text-[8px] font-black text-fp-green uppercase">Fuerza Pueblo</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#005c2b] rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <h3 className="font-bold text-lg mb-2 relative z-10">Crecimiento de la Fuerza del Pueblo</h3>
                                <div className="mt-4 flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <TrendingUp className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-black">
                                            FP
                                        </p>
                                        <p className="text-xs text-green-200 font-medium">Partido que más crece</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* --- VISTA DE PADRON (AFILIADOS) --- */
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-fp-green/10 flex items-center justify-center text-fp-green">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Total Afiliados</p>
                                <p className="text-3xl font-black text-gray-800">{affiliates.length.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Validados</p>
                                <p className="text-3xl font-black text-gray-800">{validatedCount.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Pendientes</p>
                                <p className="text-3xl font-black text-gray-800">{pendingCount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Growth Chart */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                                <TrendingUp size={20} className="mr-2 text-fp-green" /> Crecimiento del Padrón
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={growthChartData}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00843D" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#00843D" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(2)} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ color: '#64748B', fontSize: '10px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="total" stroke="#00843D" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Demographics / Distribution */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                                <MapPin size={20} className="mr-2 text-blue-600" /> Distribución por Seccional
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={seccionalChartData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} fontSize={11} fontWeight={600} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="#0051B5" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
