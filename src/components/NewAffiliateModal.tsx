"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { dbInsert } from "@/lib/dbWrite";
import { SECCIONALES } from "@/lib/mockData";
import { X, Save, Loader2, Plus, User, Mail, Phone, MapPin, Briefcase, Calendar, CreditCard, Upload } from "lucide-react";
import { registrarCambio } from "@/lib/historial";

interface NewAffiliateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewAffiliateModal({ isOpen, onClose, onSuccess }: NewAffiliateModalProps) {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userSeccional, setUserSeccional] = useState<string | null>(null);
    const [lastSavedPhone, setLastSavedPhone] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nombre: "",
        apellidos: "",
        cedula: "",
        fechaNacimiento: "",
        seccional: SECCIONALES[0],
        email: "",
        telefono: "",
        role: "Miembro" as "Miembro" | "Miembro DC" | "Presidente DM" | "Presidente DB" | "Operador" | "Admin",
        cargoOrganizacional: ""
    });

    useState(() => {
        const role = localStorage.getItem("user_role");
        const seccional = localStorage.getItem("user_seccional");
        setUserRole(role);
        setUserSeccional(seccional);

        if (role === "operador" && seccional) {
            setFormData(prev => ({ ...prev, seccional: seccional }));
        }
    });

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    if (!isOpen) return null;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let uploadedFotoUrl: string | null = null;

            // 1. Subir foto si existe
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${formData.cedula}_${Math.random()}.${fileExt}`;
                const filePath = `perfiles/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('fotos_afiliados')
                    .upload(filePath, photoFile);

                if (uploadError) {
                    console.error("Error upload (continuing without photo):", uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('fotos_afiliados')
                        .getPublicUrl(filePath);
                    uploadedFotoUrl = publicUrl;
                }
            }

            const dataToInsert: any = {
                nombre: formData.nombre,
                apellidos: formData.apellidos,
                cedula: formData.cedula,
                fecha_nacimiento: formData.fechaNacimiento,
                seccional: formData.seccional,
                email: formData.email,
                role: formData.role,
                validado: false,
                foto_url: uploadedFotoUrl || '/foto_perfil_afiliados.png'
            };

            if (formData.telefono && formData.telefono.trim() !== "") {
                dataToInsert.telefono = formData.telefono;
            }

            if (formData.cargoOrganizacional && formData.cargoOrganizacional.trim() !== "") {
                dataToInsert.cargo_organizacional = formData.cargoOrganizacional;
            }

            const result = await dbInsert('afiliados', dataToInsert);

            if (!result.success) throw new Error(result.error);

            // Registrar en el historial
            if (result.data && result.data.length > 0) {
                await registrarCambio({
                    afiliado_id: result.data[0].id,
                    accion: 'creado',
                    detalles: {
                        nombre_completo: `${formData.nombre} ${formData.apellidos}`,
                        cedula: formData.cedula,
                        seccional: formData.seccional
                    }
                });
            }

            // --- Email de Bienvenida (Next.js API) ---
            if (formData.email) {
                fetch('/api/emails/welcome', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        nombre: `${formData.nombre} ${formData.apellidos}`
                    })
                }).catch(err => console.error('Error enviando email:', err));
            }

            onSuccess();
            setLastSavedPhone(formData.telefono);

            // Reset form
            setFormData({
                nombre: "",
                apellidos: "",
                cedula: "",
                fechaNacimiento: "",
                seccional: SECCIONALES[0],
                email: "",
                telefono: "",
                role: "Miembro",
                cargoOrganizacional: ""
            });
            setPhotoFile(null);
            setPhotoPreview(null);

        } catch (error: any) {
            if (error.code === '23505') {
                if (error.message.includes('afiliados_email_unique')) {
                    alert('⚠️ Este correo electrónico ya está registrado.');
                } else if (error.message.includes('afiliados_telefono_unique')) {
                    alert('⚠️ Este número de teléfono ya está registrado.');
                } else {
                    alert('⚠️ Ya existe un afiliado con estos datos.');
                }
            } else {
                alert("Error al registrar: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (lastSavedPhone) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 p-8 text-center space-y-6 transform transition-all">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
                        <Save size={40} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">¡Registro Exitoso!</h2>
                        <p className="text-gray-500 mt-2 font-medium">El afiliado ha sido guardado correctamente.</p>
                    </div>

                    <a
                        href={`https://wa.me/${lastSavedPhone.replace(/\D/g, '')}?text=${encodeURIComponent("Hola, bienvenido a la Fuerza del Pueblo (SAE FP-Europa). Tu registro ha sido procesado exitosamente.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/30 active:scale-95"
                    >
                        <Phone size={20} className="fill-current" />
                        Enviar Bienvenida por WhatsApp
                    </a>

                    <button
                        onClick={() => {
                            setLastSavedPhone(null);
                            onClose();
                        }}
                        className="block w-full py-3 text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors rounded-lg hover:bg-gray-50"
                    >
                        Cerrar y continuar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#004d23] to-[#006e32] px-6 py-5 flex items-center justify-between shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Plus className="text-white h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-white text-xl font-bold tracking-tight">Nuevo Afiliado</h2>
                            <p className="text-green-100 text-xs font-medium opacity-90">Complete la información para el registro</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                        {/* Left Column: Photo & Basic Info */}
                        <div className="md:col-span-4 space-y-6">
                            {/* Photo Upload Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4">
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('photo-upload')?.click()}>
                                    <div className={`w-36 h-36 rounded-full border-4 ${photoPreview ? 'border-fp-green' : 'border-gray-100'} shadow-lg overflow-hidden transition-all group-hover:shadow-xl`}>
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-300 group-hover:bg-gray-100 transition-colors">
                                                <User size={48} strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-fp-green text-white p-2.5 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                        <Upload size={16} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Foto de Perfil</p>
                                    <p className="text-xs text-gray-400 mt-1">Haga clic para subir una imagen</p>
                                </div>
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </div>

                            {/* Role Selection Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase size={14} />
                                    Rol y Cargo
                                </h3>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Rol en Sistema</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    >
                                        <option value="Miembro">Miembro</option>
                                        <option value="Miembro DC">Miembro DC</option>
                                        <option value="Presidente DM">Presidente DM</option>
                                        <option value="Presidente DB">Presidente DB</option>
                                        <option value="Operador">Operador</option>
                                        <option value="Admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Cargo (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: S. General"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all placeholder:text-gray-400"
                                        value={formData.cargoOrganizacional}
                                        onChange={e => setFormData({ ...formData, cargoOrganizacional: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Details Forms */}
                        <div className="md:col-span-8 space-y-6">
                            {/* Personal Info */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <User size={14} />
                                    Información Personal
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Apellidos</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all"
                                            value={formData.apellidos}
                                            onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <CreditCard size={14} className="text-gray-400" />
                                            Cédula
                                        </label>
                                        <input
                                            required
                                            placeholder="001-0000000-0"
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium font-mono tracking-tight transition-all"
                                            value={formData.cedula}
                                            onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Calendar size={14} className="text-gray-400" />
                                            Fecha de Nacimiento
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all"
                                            value={formData.fechaNacimiento}
                                            onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <MapPin size={14} />
                                    Contacto y Ubicación
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Mail size={14} className="text-gray-400" />
                                            Correo Electrónico
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="ejemplo@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Phone size={14} className="text-gray-400" />
                                            Celular (WhatsApp)
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="Ej: 34600123456"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all"
                                            value={formData.telefono}
                                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1 ml-1">Incluya el código de país (ej. 34)</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Seccional</label>
                                        <select
                                            disabled={userRole === "operador"}
                                            className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fp-green focus:border-transparent text-gray-900 font-medium transition-all ${userRole === "operador" ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={formData.seccional}
                                            onChange={e => setFormData({ ...formData, seccional: e.target.value })}
                                        >
                                            {SECCIONALES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="bg-white border-t border-gray-200 p-6 flex justify-end gap-3 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-fp-green text-white rounded-xl font-bold hover:bg-fp-green-dark transition-all shadow-lg hover:shadow-green-500/30 active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {loading ? 'Guardando...' : 'Guardar Afiliado'}
                    </button>
                </div>
            </div>
        </div>
    );
}
