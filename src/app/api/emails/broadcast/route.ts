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
        const { asunto, mensaje, destinatarios } = body;

        if (!asunto || !mensaje) {
            return NextResponse.json({ error: 'Asunto y Mensaje son requeridos' }, { status: 400 });
        }

        let contactos = destinatarios;

        // Si no se reciben contactos (backward compatibility o uso directo API), buscar en DB
        if (!contactos || !Array.isArray(contactos) || contactos.length === 0) {
            console.log("[Broadcast] No se recibieron destinatarios, buscando en DB...");
            const { data: dbContactos, error: dbError } = await supabaseAdmin
                .from('comunicaciones_contactos')
                .select('email, nombre')
                .eq('activo', true);

            if (dbError) throw dbError;
            contactos = dbContactos;
        }

        if (!contactos || contactos.length === 0) {
            return NextResponse.json({ message: 'No hay contactos activos para enviar.' });
        }

        console.log(`[Broadcast] Iniciando envío a ${contactos.length} contactos. Asunto: ${asunto}`);

        // 2. Enviar en Lotes (Batches) de Resend (Max 100 por batch)
        // El frontend YA envía en lotes de 50, pero por seguridad y si se usa directo la API,
        // aseguramos que no exceda el límite de Resend.
        const batchSize = 100;
        let sentCount = 0;
        let errorCount = 0;
        const debugErrors = [];

        for (let i = 0; i < contactos.length; i += batchSize) {
            const chunk = contactos.slice(i, i + batchSize);

            const emailBatch = chunk.map((contacto: any) => ({
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
                                        <img src="https://centinelaelectoralsaeeuropa.com/logo-fp.png" alt="FP Logo" width="50" height="50" style="border-radius: 8px; background: #e5e0e0; padding: 4px;" />
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
                const { data, error } = await resend.batch.send(emailBatch);

                if (error) {
                    console.error("[Broadcast Error] Error batch:", error);
                    errorCount += chunk.length;
                    debugErrors.push(error);
                } else {
                    // Resend devuelve data con un array de IDs
                    console.log("[Broadcast Success] Batch enviado. Metadata:", JSON.stringify(data));
                    sentCount += chunk.length;

                    // Log each email in the batch to the comunicaciones table
                    try {
                        const logEntries = chunk.map((contacto: any) => ({
                            tipo: 'email_masivo',
                            asunto: asunto,
                            contenido: mensaje,
                            estado: 'enviado',
                            fecha_envio: new Date().toISOString(),
                            email_id: data && 'id' in data ? (data as any).id : null,
                            // Si tenemos el ID del afiliado lo pondríamos aquí, 
                            // pero contactos solo tiene email y nombre por ahora.
                            // Buscamos si podemos obtener el ID o si permitimos null.
                            // Por ahora logueamos el intento.
                        }));

                        const { error: dbError } = await supabaseAdmin
                            .from('comunicaciones')
                            .insert(logEntries);

                        if (dbError) console.error("[Broadcast Log Error]", dbError);
                    } catch (logErr) {
                        console.error("[Broadcast Log Exception]", logErr);
                    }
                }
            } catch (err) {
                console.error("[Broadcast Exception] Excepción en batch:", err);
                errorCount += chunk.length;
                debugErrors.push(err);
            }
        }

        // Devolver success siempre que no sea un fallo catastrófico total
        // Incluimos debug info para que el usuario pueda ver si algo falló silenciosamente
        return NextResponse.json({
            success: sentCount > 0,
            total: contactos.length,
            sent: sentCount,
            errors: errorCount,
            debugInfo: debugErrors.length > 0 ? debugErrors : undefined
        });

    } catch (error: any) {
        console.error("[Broadcast Fatal Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
