import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Inicializar Supabase Admin (para leer todos los contactos sin restricciones de RLS si fuera necesario, 
// aunque idealmente usamos el cliente autenticado, aquí usaremos anon key pero el RLS debe permitir al admin leer)
// Para el backend job, es mejor usar la Service Role Key si queremos garantizar acceso total, 
// pero usaremos la configuración estándar asumiendo que el usuario que llama tiene permisos o la tabla es legible.
// MEJOR: Usamos Service Role para asegurar que podemos leer toda la lista de distribución.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { asunto, mensaje } = body;

        if (!asunto || !mensaje) {
            return NextResponse.json({ error: 'Asunto y Mensaje son requeridos' }, { status: 400 });
        }

        // 1. Obtener destinatarios (Solo activos)
        // NOTA: En producción con miles de usuarios, esto debe paginarse.
        const { data: contactos, error: dbError } = await supabaseAdmin
            .from('comunicaciones_contactos')
            .select('email, nombre')
            .eq('activo', true);

        if (dbError) throw dbError;

        if (!contactos || contactos.length === 0) {
            return NextResponse.json({ message: 'No hay contactos activos para enviar.' });
        }

        console.log(`[Broadcast] Iniciando envío a ${contactos.length} contactos. Asunto: ${asunto}`);

        // 2. Enviar en Lotes (Batches) de Resend (Max 100 por batch)
        // Documentación: https://resend.com/docs/api/emails/send-batch
        const batchSize = 50; // Conservador
        let sentCount = 0;
        let errorCount = 0;

        for (let i = 0; i < contactos.length; i += batchSize) {
            const chunk = contactos.slice(i, i + batchSize);

            const emailBatch = chunk.map(contacto => ({
                from: 'Secretaría Asuntos Electorales <info@centinelaelectoralsaeeuropa.com>',
                to: [contacto.email],
                subject: asunto,
                html: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                        <!-- Header con Logo y Títulos -->
                        <div style="background-color: #005c2b; padding: 20px 25px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td width="60" valign="middle">
                                        <img src="https://centinelaelectoralsaeeuropa.com/logo-fp.png" alt="FP Logo" width="50" height="50" style="border-radius: 8px; background: white; padding: 4px;" />
                                    </td>
                                    <td valign="middle" style="padding-left: 15px;">
                                        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">Fuerza del Pueblo Europa</h1>
                                        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0 0; font-size: 13px; font-weight: 500;">Secretaría de Asuntos Electorales</p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Banda de Comunicado Oficial -->
                        <div style="background-color: #f8f9fa; padding: 10px 25px; border-bottom: 1px solid #e0e0e0;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px;">📢 Comunicado Oficial</p>
                        </div>
                        
                        <!-- Contenido del Mensaje -->
                        <div style="padding: 25px; background: white;">
                            <p style="margin: 0 0 15px 0; font-size: 15px;">Estimado/a <strong>${contacto.nombre}</strong>,</p>
                            <div style="white-space: pre-line; line-height: 1.7; font-size: 15px; color: #444;">
                                ${mensaje.replace(/\n/g, '<br/>')}
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background-color: #f8f9fa; padding: 20px 25px; border-top: 1px solid #e0e0e0;">
                            <!-- Sección de Contacto y Legales -->
                            <div style="text-align: center; margin-bottom: 20px;">
                                <p style="font-size: 13px; color: #555; margin: 0 0 8px 0;">
                                    Por favor <a href="https://centinelaelectoralsaeeuropa.com/contacto" style="color: #005c2b; text-decoration: none; font-weight: bold;">contáctanos</a> si tienes alguna inquietud.
                                </p>
                                <p style="font-size: 11px; color: #888; margin: 0;">
                                    <a href="https://centinelaelectoralsaeeuropa.com/privacidad" style="color: #666; text-decoration: none;">Privacidad y Política de Cookie</a>
                                    <span style="margin: 0 5px;">|</span>
                                    <a href="https://centinelaelectoralsaeeuropa.com/terminos" style="color: #666; text-decoration: none;">Términos y Condiciones</a>
                                </p>
                            </div>

                            <!-- Disclaimer original (ahora al final) -->
                            <p style="font-size: 11px; text-align: center; color: #aaa; margin: 0; border-top: 1px solid #e0e0e0; padding-top: 15px;">
                                Recibes este correo porque estás registrado en el CRM Electoral de la FP Europa.<br/>
                                <a href="https://centinelaelectoralsaeeuropa.com" style="color: #005c2b; text-decoration: none;">centinelaelectoralsaeeuropa.com</a>
                            </p>
                        </div>
                    </div>
                `
            }));

            try {
                // Enviar batch
                const { error } = await resend.batch.send(emailBatch);
                if (error) {
                    console.error("Error batch:", error);
                    errorCount += chunk.length;
                } else {
                    sentCount += chunk.length;
                }
            } catch (err) {
                console.error("Excepción en batch:", err);
                errorCount += chunk.length;
            }
        }

        return NextResponse.json({
            success: true,
            total: contactos.length,
            sent: sentCount,
            errors: errorCount
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
