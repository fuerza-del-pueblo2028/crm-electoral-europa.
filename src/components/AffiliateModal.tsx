"use client";

import { Affiliate, SECCIONALES } from "@/lib/mockData";
import { X, CheckCircle, XCircle, ShieldCheck, MessageSquare, Mail, Copy, Send, Phone, Trash2, Edit2, Save, Clock, Loader2, AlertCircle } from "lucide-react";
import { CarnetGenerator } from "./CarnetGenerator";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { dbUpdate, dbDelete, dbUpsert } from "@/lib/dbWrite";
import { registrarCambio, obtenerHistorial, formatAccion } from "@/lib/historial";

interface AffiliateModalProps {
    isOpen: boolean;
    onClose: () => void;
    affiliate: Affiliate | null;
    onDelete?: () => void;
}

const TEMPLATES = {
    bienvenida: {
        label: "Bienvenida",
        subject: "Bienvenido a la Fuerza del Pueblo",
        text: "¡Hola! Es un honor darte la bienvenida a la Plataforma Electoral de la Fuerza del Pueblo en Europa \"CRM Electoral\". Tu registro ha sido procesado exitosamente. Estamos a tu disposición."
    },
    info: {
        label: "Información General",
        subject: "Información Importante - FP Europa",
        text: "Hola, te compartimos información relevante sobre las próximas actividades de la seccional. Mantente atento."
    },
    verificacion: {
        label: "Solicitud de Datos",
        subject: "Actualización de Datos - SAE",
        text: "Saludos. Necesitamos confirmar algunos datos de tu perfil para completar tu validación en el padrón. Por favor contáctanos."
    },
    custom: {
        label: "Mensaje Personalizado",
        subject: "",
        text: ""
    }
};

export function AffiliateModal({ isOpen, onClose, affiliate, onDelete }: AffiliateModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCarnet, setShowCarnet] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'contact' | 'historial'>('info');
    const [canManage, setCanManage] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [historial, setHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Messaging State
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('bienvenida');
    const [messageText, setMessageText] = useState(TEMPLATES.bienvenida.text);
    const [emailSubject, setEmailSubject] = useState(TEMPLATES.bienvenida.subject);

    useEffect(() => {
        if (selectedTemplate !== 'custom') {
            setMessageText(TEMPLATES[selectedTemplate].text);
            setEmailSubject(TEMPLATES[selectedTemplate].subject);
        }
    }, [selectedTemplate]);

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        const userSeccional = localStorage.getItem('user_seccional');

        if (role === 'administrador' || role === 'admin' || role === 'Admin') {
            setCanManage(true);
        } else if (role === 'operador' && affiliate && userSeccional === affiliate.seccional) {
            setCanManage(true);
        } else {
            setCanManage(false);
        }
    }, [affiliate]);

    // Cargar historial cuando se abre el modal
    useEffect(() => {
        if (isOpen && affiliate) {
            cargarHistorial();
        }
    }, [isOpen, affiliate]);

    const cargarHistorial = async () => {
        if (!affiliate) return;
        setLoadingHistorial(true);
        const data = await obtenerHistorial(affiliate.id);
        setHistorial(data);
        setLoadingHistorial(false);
    };

    if (!isOpen || !affiliate) return null;

    const handleWhatsApp = () => {
        if (!affiliate.telefono) {
            alert('Este afiliado no tiene teléfono registrado');
            return;
        }

        // Limpiar número: quitar espacios, guiones, paréntesis
        let phone = affiliate.telefono.replace(/[\s\-\(\)]/g, '');

        // Si no empieza con +, agregar código de España por defecto (+34)
        if (!phone.startsWith('+')) {
            if (phone.startsWith('34')) {
                phone = '+' + phone;
            } else {
                phone = '+34' + phone;
            }
        }

        const encodedText = encodeURIComponent(messageText);
        // URL correcta: https://wa.me/NUMERO?text=MENSAJE
        window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
    };

    const handleEmail = async () => {
        if (!affiliate.email) {
            alert('Este afiliado no tiene email registrado');
            return;
        }

        if (!emailSubject.trim() || !messageText.trim()) {
            alert('Por favor, completa el asunto y el mensaje antes de enviar');
            return;
        }

        const confirmed = confirm(
            `¿Enviar email a ${affiliate.email}?\n\n` +
            `Asunto: ${emailSubject}\n\n` +
            `El email se enviará desde no-reply@centinelaelectoralsaeeuropa.com`
        );

        if (!confirmed) return;

        try {
            // Usar Supabase RPC para llamar a la función PostgreSQL
            const { data, error } = await supabase.rpc('send_email_resend', {
                p_to: affiliate.email,
                p_subject: emailSubject,
                p_message: messageText,
                p_afiliado_id: affiliate.id
            });

            if (error) {
                console.error('Error de Supabase RPC:', error);
                alert(`❌ Error al enviar el email: ${error.message}`);
                return;
            }

            // Verificar resultado de la función
            if (data && data.success) {
                alert('✅ Email enviado correctamente');
                // Limpiar campos
                setEmailSubject('');
                setMessageText('');
                setSelectedTemplate('custom');
            } else {
                console.error('Error del servidor:', data);
                alert(`❌ Error al enviar el email: ${data?.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error enviando email:', error);
            alert('❌ Error inesperado al enviar el email. Verifica la configuración de Supabase.');
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !affiliate) return;

        setUploadingPhoto(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${affiliate.cedula}_${Math.random()}.${fileExt}`;
            const filePath = `perfiles/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('fotos_afiliados')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('fotos_afiliados')
                .getPublicUrl(filePath);

            const result = await dbUpdate('afiliados', { foto_url: publicUrl }, { id: affiliate.id });

            if (!result.success) throw new Error(result.error);

            await registrarCambio({
                afiliado_id: affiliate.id,
                accion: 'editado',
                campo_modificado: 'foto_url',
                valor_anterior: affiliate.foto_url || 'sin foto',
                valor_nuevo: publicUrl
            });

            alert('✅ Foto actualizada correctamente');
            if (onDelete) onDelete(); // Refresh local data
        } catch (error: any) {
            console.error('Error al subir foto:', error);
            alert('❌ Error al subir la foto: ' + error.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!affiliate) {
            console.error('No affiliate data found');
            return;
        }

        // Show the custom confirmation UI
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!affiliate) return;

        setIsSubmitting(true);
        setShowDeleteConfirm(false); // Hide the confirmation UI once confirmed

        try {
            // 1. Eliminar historial primero (para evitar error de Foreign Key si no hay CASCADE)
            await dbDelete('afiliados_historial', { afiliado_id: affiliate.id });

            // 2. Eliminar de europa_presidentes_dm si aplica
            if (affiliate.role === 'Presidente DM') {
                const deletePresResult = await dbDelete('europa_presidentes_dm', { cedula: affiliate.cedula });
                if (!deletePresResult.success) {
                    console.error('Error eliminando de Presidente DM:', deletePresResult.error);
                }
            }

            // 3. Finalmente eliminar el afiliado
            const deleteResult = await dbDelete('afiliados', { id: affiliate.id });

            if (!deleteResult.success) {
                alert('❌ Error al eliminar: ' + deleteResult.error);
            } else {
                alert('✅ Afiliado eliminado exitosamente');
                onClose();
                if (onDelete) onDelete();
            }
        } catch (error: any) {
            console.error('Error al eliminar:', error);
            alert('❌ Error: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-fp-green to-[#0d5f20] px-8 pt-6 pb-0 flex flex-col gap-6 relative overflow-hidden">
                    {/* Decorative pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h2 className="text-white text-2xl font-bold tracking-tight">Ficha del Afiliado</h2>
                            <p className="text-fp-green-100/80 text-sm font-medium mt-1">Detalle y gestión de miembro</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {canManage && !isEditing && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setEditForm({
                                            nombre: affiliate.name,
                                            apellidos: affiliate.lastName,
                                            email: affiliate.email || '',
                                            telefono: affiliate.telefono || '',
                                            seccional: affiliate.seccional,
                                            cargo_organizacional: affiliate.cargo_organizacional || '',
                                            role: affiliate.role
                                        });
                                    }}
                                    className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2.5 rounded-xl"
                                    title="Editar"
                                    disabled={isSubmitting}
                                >
                                    <Edit2 size={20} />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2.5 rounded-xl"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-1 relative z-10">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl relative top-[1px] ${activeTab === 'info'
                                ? 'bg-white text-fp-green shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            Información
                        </button>
                        <button
                            onClick={() => setActiveTab('contact')}
                            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl flex items-center gap-2 relative top-[1px] ${activeTab === 'contact'
                                ? 'bg-white text-fp-green shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <MessageSquare size={16} /> Contacto
                        </button>
                        <button
                            onClick={() => setActiveTab('historial')}
                            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl flex items-center gap-2 relative top-[1px] ${activeTab === 'historial'
                                ? 'bg-white text-fp-green shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Clock size={16} /> Historial
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 bg-white min-h-[400px]">
                    {activeTab === 'info' ? (
                        <>
                            {isEditing ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* ... (Editing form remains largely same but could benefit from styles check) ... */}
                                        {/* Skipping full form rewrite here for brevity unless requested, focusing on display mode first */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                value={editForm.nombre || ''}
                                                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fp-green"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Apellidos</label>
                                            <input
                                                type="text"
                                                value={editForm.apellidos || ''}
                                                onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fp-green"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={editForm.email || ''}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fp-green"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                            <input
                                                type="tel"
                                                value={editForm.telefono || ''}
                                                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fp-green"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                Seccional
                                            </label>
                                            <select
                                                value={editForm.seccional || ''}
                                                onChange={(e) => setEditForm({ ...editForm, seccional: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fp-green"
                                                disabled={isSubmitting}
                                            >
                                                {SECCIONALES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                Cargo Organizacional (Opcional)
                                            </label>
                                            <select
                                                value={editForm.cargo_organizacional || ''}
                                                onChange={(e) => setEditForm({ ...editForm, cargo_organizacional: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fp-green"
                                                disabled={isSubmitting}
                                            >
                                                <option value="">-- Sin cargo específico --</option>
                                                <option value="Miembro Dirección Central">Miembro Dirección Central</option>
                                                <option value="Presidente DM">Presidente DM</option>
                                                <option value="Presidente DB">Presidente DB</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Selecciona si tiene un rol especial en la organización</p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-red-600 mb-1 flex items-center gap-2">
                                                <ShieldCheck size={16} />
                                                Role del Sistema (Permisos)
                                            </label>
                                            <select
                                                value={editForm.role || 'Miembro'}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-red-50 font-bold text-red-900"
                                                disabled={isSubmitting}
                                            >
                                                <option value="Miembro">Miembro (Sin permisos especiales)</option>
                                                <option value="Miembro DC">Miembro DC (Dirección Central)</option>
                                                <option value="Presidente DM">Presidente DM</option>
                                                <option value="Presidente DB">Presidente DB</option>
                                                <option value="Operador">Operador (Puede gestionar afiliados)</option>
                                                <option value="Admin">Admin (Acceso total al sistema)</option>
                                            </select>
                                            <p className="text-xs text-red-500 mt-1 font-medium">⚠️ Cambiar el role afecta los permisos de acceso al sistema</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                            disabled={isSubmitting}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                // Verificar si el role cambió
                                                const roleChanged = editForm.role !== affiliate.role;

                                                if (roleChanged) {
                                                    const roleNames = {
                                                        'Miembro': 'Miembro (sin permisos)',
                                                        'Operador': 'Operador (puede gestionar afiliados)',
                                                        'Admin': 'Administrador (acceso total)'
                                                    };

                                                    const confirmMsg = `🔐 CAMBIO DE PERMISOS DE SEGURIDAD\n\n` +
                                                        `Estás a punto de cambiar el role de:\n` +
                                                        `➤ ${roleNames[affiliate.role as keyof typeof roleNames] || affiliate.role}\n` +
                                                        `a:\n` +
                                                        `➤ ${roleNames[editForm.role as keyof typeof roleNames] || editForm.role}\n\n` +
                                                        `Esto modificará los permisos de acceso al sistema.\n\n` +
                                                        `¿Estás seguro de continuar?`;

                                                    if (!confirm(confirmMsg)) {
                                                        return;
                                                    }
                                                }

                                                setIsSubmitting(true);
                                                try {
                                                    const result = await dbUpdate('afiliados', {
                                                        nombre: editForm.nombre,
                                                        apellidos: editForm.apellidos,
                                                        email: editForm.email || null,
                                                        telefono: editForm.telefono || null,
                                                        seccional: editForm.seccional,
                                                        cargo_organizacional: editForm.cargo_organizacional || null,
                                                        role: editForm.role
                                                    }, { id: affiliate.id });

                                                    if (!result.success) {
                                                        if (result.error?.includes('23505')) {
                                                            if (result.error.includes('email')) {
                                                                alert('⚠️ Este email ya está registrado');
                                                            } else if (result.error.includes('telefono')) {
                                                                alert('⚠️ Este teléfono ya está registrado');
                                                            }
                                                        } else {
                                                            alert('Error: ' + result.error);
                                                        }
                                                    } else if (!result.data || result.data.length === 0) {
                                                        alert('⚠️ No se pudieron guardar los cambios.\n\nContacta al administrador del sistema.');
                                                    } else {
                                                        // Registrar cambios en el historial
                                                        const cambios: string[] = [];

                                                        if (editForm.nombre !== affiliate.name) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'editado',
                                                                campo_modificado: 'nombre',
                                                                valor_anterior: affiliate.name,
                                                                valor_nuevo: editForm.nombre
                                                            });
                                                            cambios.push('nombre');
                                                        }

                                                        if (editForm.apellidos !== affiliate.lastName) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'editado',
                                                                campo_modificado: 'apellidos',
                                                                valor_anterior: affiliate.lastName,
                                                                valor_nuevo: editForm.apellidos
                                                            });
                                                            cambios.push('apellidos');
                                                        }

                                                        if (editForm.email !== (affiliate.email || '')) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'editado',
                                                                campo_modificado: 'email',
                                                                valor_anterior: affiliate.email || 'sin email',
                                                                valor_nuevo: editForm.email || 'sin email'
                                                            });
                                                            cambios.push('email');
                                                        }

                                                        if (editForm.telefono !== (affiliate.telefono || '')) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'editado',
                                                                campo_modificado: 'telefono',
                                                                valor_anterior: affiliate.telefono || 'sin teléfono',
                                                                valor_nuevo: editForm.telefono || 'sin teléfono'
                                                            });
                                                            cambios.push('teléfono');
                                                        }

                                                        if (editForm.seccional !== affiliate.seccional) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'editado',
                                                                campo_modificado: 'seccional',
                                                                valor_anterior: affiliate.seccional,
                                                                valor_nuevo: editForm.seccional
                                                            });
                                                            cambios.push('seccional');
                                                        }

                                                        if (editForm.cargo_organizacional !== (affiliate.cargo_organizacional || '')) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'editado',
                                                                campo_modificado: 'cargo_organizacional',
                                                                valor_anterior: affiliate.cargo_organizacional || 'sin cargo',
                                                                valor_nuevo: editForm.cargo_organizacional || 'sin cargo'
                                                            });
                                                            cambios.push('cargo organizacional');
                                                        }

                                                        // --- Sincronización con europa_presidentes_dm ---
                                                        const isPresidenteDM = editForm.role === 'Presidente DM';
                                                        const wasPresidenteDM = affiliate.role === 'Presidente DM';

                                                        if (isPresidenteDM) {
                                                            // Upsert (Insertar o Actualizar) en europa_presidentes_dm
                                                            const nombreCompleto = `${editForm.nombre} ${editForm.apellidos}`;

                                                            const syncResult = await dbUpsert('europa_presidentes_dm', {
                                                                cedula: affiliate.cedula,
                                                                nombre_completo: nombreCompleto,
                                                                celular: editForm.telefono,
                                                                condado_provincia: editForm.seccional,
                                                                pais: 'España',
                                                                status: 'Activo'
                                                            }, { onConflict: 'cedula' });

                                                            if (!syncResult.success) {
                                                                console.error('Error sincronizando Presidente DM:', syncResult.error);
                                                            }
                                                        } else if (wasPresidenteDM && !isPresidenteDM) {
                                                            const deleteResult = await dbDelete('europa_presidentes_dm', { cedula: affiliate.cedula });

                                                            if (!deleteResult.success) {
                                                                console.error('Error eliminando de Presidente DM:', deleteResult.error);
                                                            }
                                                        }
                                                        // ------------------------------------------------

                                                        if (roleChanged) {
                                                            await registrarCambio({
                                                                afiliado_id: affiliate.id,
                                                                accion: 'role_cambiado',
                                                                campo_modificado: 'role',
                                                                valor_anterior: affiliate.role,
                                                                valor_nuevo: editForm.role
                                                            });
                                                        }

                                                        if (roleChanged) {
                                                            alert(`✅ Datos actualizados\n🔐 Role cambiado a: ${editForm.role}`);
                                                        } else {
                                                            alert('✅ Datos actualizados');
                                                        }
                                                        setIsEditing(false);
                                                        onClose();
                                                        if (onDelete) onDelete(); // Refresh
                                                    }
                                                } catch (error: any) {
                                                    alert('Error: ' + error.message);
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }}
                                            className="px-4 py-2 bg-fp-green text-white rounded-lg hover:bg-fp-green-dark flex items-center gap-2 disabled:opacity-50 font-bold shadow-md"
                                            disabled={isSubmitting}
                                        >
                                            <Save size={18} />
                                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Left Column: Photo & Status */}
                                    <div className="flex flex-col items-center gap-4 min-w-[200px]">
                                        <div className="w-48 h-48 rounded-full p-1 bg-gradient-to-tr from-fp-green to-[#0d5f20] shadow-xl relative group">
                                            <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-white">
                                                <img
                                                    src={affiliate.foto_url || "/foto_perfil_afiliados.png"}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {canManage && (
                                                <div
                                                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                    onClick={() => document.getElementById('photo-update')?.click()}
                                                >
                                                    <span className="text-white text-xs font-bold uppercase tracking-wider text-center px-4">
                                                        {uploadingPhoto ? "Subiendo..." : "Cambiar Foto"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <input
                                            id="photo-update"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoChange}
                                            disabled={uploadingPhoto}
                                        />

                                        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 border shadow-sm ${affiliate.validated
                                            ? 'bg-green-50 border-green-200 text-green-700'
                                            : 'bg-orange-50 border-orange-200 text-orange-700'
                                            }`}>
                                            {affiliate.validated ?
                                                <CheckCircle size={14} className="text-green-600" /> :
                                                <AlertCircle size={14} className="text-orange-600" />
                                            }
                                            <span className="text-xs font-bold uppercase tracking-wide">
                                                {affiliate.validated ? "Validado" : "Pendiente"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Column: Details */}
                                    <div className="flex-1 space-y-8">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Nombre Completo</label>
                                                <p className="text-xl font-bold text-gray-900 leading-tight">
                                                    {affiliate.name} {affiliate.lastName}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Número de Cédula</label>
                                                <p className="font-mono text-lg font-bold text-fp-green tracking-tight">
                                                    {affiliate.cedula}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Delegación/Seccional</label>
                                                <div className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-bold text-xs uppercase tracking-wide">
                                                    {affiliate.seccional}
                                                </div>
                                            </div>
                                            {affiliate.cargo_organizacional && (
                                                <div>
                                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Cargo Organizacional</label>
                                                    <div className="inline-flex px-2.5 py-1 rounded-md bg-fp-green/10 text-fp-green font-bold text-xs uppercase tracking-wide">
                                                        {affiliate.cargo_organizacional}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="col-span-2 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Correo Electrónico</label>
                                                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                                                        <Mail size={14} className="text-gray-400" />
                                                        <span className="truncate">{affiliate.email || 'No registrado'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">WhatsApp</label>
                                                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                                                        <Phone size={14} className="text-gray-400" />
                                                        <span>{affiliate.telefono || 'No registrado'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                {canManage && (
                                                    <button
                                                        onClick={async () => {
                                                            setIsSubmitting(true);
                                                            try {
                                                                const newStatus = !affiliate.validated;
                                                                const result = await dbUpdate('afiliados', { validado: newStatus }, { id: affiliate.id });

                                                                if (!result.success) {
                                                                    alert('Error al actualizar: ' + result.error);
                                                                } else {
                                                                    // Registrar en historial
                                                                    await registrarCambio({
                                                                        afiliado_id: affiliate.id,
                                                                        accion: newStatus ? 'validado' : 'invalidado',
                                                                        valor_anterior: affiliate.validated ? 'validado' : 'pendiente',
                                                                        valor_nuevo: newStatus ? 'validado' : 'pendiente'
                                                                    });

                                                                    onClose();
                                                                    if (onDelete) onDelete(); // Refresh data
                                                                }
                                                            } catch (error: any) {
                                                                console.error('Error:', error);
                                                                alert('Error: ' + (error.message || 'Error desconocido'));
                                                            } finally {
                                                                setIsSubmitting(false);
                                                            }
                                                        }}
                                                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-sm ${affiliate.validated
                                                            ? "bg-white text-orange-600 border border-orange-200 hover:bg-orange-50"
                                                            : "bg-fp-green text-white border border-transparent hover:bg-fp-green-dark shadow-fp-green/30"
                                                            } disabled:opacity-50`}
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? (
                                                            <span>Procesando...</span>
                                                        ) : affiliate.validated ? (
                                                            <>
                                                                <XCircle size={16} />
                                                                <span>Invalidar</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle size={16} />
                                                                <span>Validar</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowCarnet(!showCarnet)}
                                                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-sm ${showCarnet
                                                        ? "bg-gray-100 text-gray-600 border border-gray-200"
                                                        : "bg-gray-900 text-white hover:bg-black shadow-gray-900/30"
                                                        }`}
                                                >
                                                    <ShieldCheck size={16} />
                                                    <span>{showCarnet ? "Cerrar Carnet" : "Carnet Digital"}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Expandable Carnet Section */}
                            {showCarnet && (
                                <div className="mt-8 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="bg-gray-50 rounded-[24px] p-8 border border-gray-100 shadow-inner">
                                        <div className="text-center mb-8">
                                            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-1">Carnet Digital</h3>
                                            <p className="text-xs text-gray-500 font-medium">Vista previa y descarga del documento oficial</p>
                                        </div>
                                        <CarnetGenerator affiliate={affiliate} />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : activeTab === 'contact' ? (
                        /* Contact Tab Content */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Plantilla</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedTemplate(key)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedTemplate === key
                                                ? "bg-fp-green text-white border-fp-green shadow-md"
                                                : "bg-white text-gray-500 border-gray-200 hover:border-fp-green/50"
                                                }`}
                                        >
                                            {TEMPLATES[key].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-1">Asunto (Solo Email)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fp-green text-sm font-medium"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        placeholder="Asunto del correo..."
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-1">Mensaje</label>
                                    <textarea
                                        className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fp-green text-sm text-gray-700 resize-none"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Escribe tu mensaje aquí..."
                                    ></textarea>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(messageText)}
                                        className="absolute right-3 bottom-3 text-gray-400 hover:text-fp-green transition-colors"
                                        title="Copiar texto"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    onClick={handleWhatsApp}
                                    className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/30 active:scale-95"
                                >
                                    <Phone size={20} />
                                    <span>Enviar WhatsApp</span>
                                </button>
                                <button
                                    onClick={handleEmail}
                                    disabled={!affiliate.email}
                                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-gray-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Mail size={20} />
                                    <span>Enviar Email</span>
                                </button>
                            </div>

                            <p className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
                                <ShieldCheck size={12} />
                                Las comunicaciones se enviarán desde tus aplicaciones predeterminadas por seguridad.
                            </p>
                        </div>
                    ) : activeTab === 'historial' ? (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 max-h-96 overflow-y-auto pr-2">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Historial de Cambios</h3>
                                    <p className="text-xs text-gray-500 mt-1">Registro de todas las modificaciones realizadas</p>
                                </div>
                                <button
                                    onClick={cargarHistorial}
                                    disabled={loadingHistorial}
                                    className="text-fp-green hover:text-fp-green-dark transition-colors p-2 hover:bg-green-50 rounded-lg"
                                    title="Actualizar historial"
                                >
                                    <Clock size={18} className={loadingHistorial ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {loadingHistorial ? (
                                <div className="flex flex-col items-center py-12 space-y-3">
                                    <Loader2 className="animate-spin text-fp-green" size={32} />
                                    <p className="text-xs text-gray-400 font-medium">Cargando historial...</p>
                                </div>
                            ) : historial.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                        <Clock size={28} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-400 font-bold text-sm">Sin historial de cambios</p>
                                    <p className="text-gray-400 text-xs">Este afiliado aún no tiene cambios registrados</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                                    <div className="space-y-4">
                                        {historial.map((item, index) => {
                                            const { icon, text, color } = formatAccion(item.accion);
                                            const fecha = new Date(item.created_at);
                                            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });

                                            return (
                                                <div key={item.id} className="relative flex gap-4 items-start">
                                                    {/* Timeline dot */}
                                                    <div className={`w-12 h-12 rounded-full bg-white border-2 ${item.accion === 'eliminado' ? 'border-red-300' :
                                                        item.accion === 'creado' ? 'border-green-300' :
                                                            item.accion === 'validado' ? 'border-green-300' :
                                                                item.accion === 'role_cambiado' ? 'border-purple-300' :
                                                                    'border-blue-300'
                                                        } flex items-center justify-center text-xl z-10 shadow-sm`}>
                                                        {icon}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <p className={`font-bold text-sm ${color} mb-1`}>
                                                                    {text}
                                                                </p>

                                                                {item.campo_modificado && (
                                                                    <div className="space-y-1 mt-2">
                                                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                                                            Campo: {item.campo_modificado}
                                                                        </p>
                                                                        {item.valor_anterior && item.valor_nuevo && (
                                                                            <div className="flex items-center gap-2 text-xs">
                                                                                <span className="text-red-600 line-through font-mono bg-red-50 px-2 py-1 rounded">
                                                                                    {item.valor_anterior}
                                                                                </span>
                                                                                <span className="text-gray-400">→</span>
                                                                                <span className="text-green-600 font-mono bg-green-50 px-2 py-1 rounded font-bold">
                                                                                    {item.valor_nuevo}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {item.detalles && Object.keys(item.detalles).length > 0 && (
                                                                    <div className="mt-2 text-xs text-gray-500">
                                                                        {item.detalles.nombre_completo && (
                                                                            <p>👤 {item.detalles.nombre_completo}</p>
                                                                        )}
                                                                        {item.detalles.cedula && (
                                                                            <p>🆔 {item.detalles.cedula}</p>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                                                                    <span className="font-medium">{item.usuario_nombre || 'Sistema'}</span>
                                                                    <span>•</span>
                                                                    <span>{fechaFormateada}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer con opción de eliminar */}
                <div className="px-8 pb-8 pt-2">
                    {activeTab === 'info' && !isEditing && canManage && (
                        <>
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full py-2.5 rounded-xl font-medium text-xs text-red-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    <Trash2 size={14} />
                                    <span>Eliminar Afiliado de la Base de Datos</span>
                                </button>
                            ) : (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-in fade-in zoom-in duration-200">
                                    <div className="flex items-start gap-3 mb-3">
                                        <AlertCircle className="text-red-600 shrink-0" size={20} />
                                        <div>
                                            <p className="font-bold text-red-700 text-sm">¿Estás seguro?</p>
                                            <p className="text-xs text-red-600 mt-1">
                                                Esta acción es irreversible. Se eliminarán todos los datos, historial y documentos asociados.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                                            disabled={isSubmitting}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={performDelete}
                                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={12} className="animate-spin" />
                                                    Eliminando...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={12} />
                                                    Confirmar Eliminación
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}


