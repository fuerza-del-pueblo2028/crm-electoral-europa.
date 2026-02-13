import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, subject, message, afiliadoId } = body;

        console.log(`[Send Email] Sending to: ${to}`);
        console.log(`[Send Email] Subject: ${subject}`);

        // Validaciones
        if (!to || !subject || !message) {
            console.error('[Send Email] Missing required fields');
            return NextResponse.json({
                success: false,
                error: 'Faltan campos requeridos (to, subject, message)'
            }, { status: 400 });
        }

        // Verificar API Key
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey || apiKey.includes('PLACEHOLDER')) {
            console.warn('[Send Email] RESEND_API_KEY not configured. Email skipped.');
            return NextResponse.json({
                success: false,
                warning: 'API Key de Resend no configurada'
            }, { status: 200 });
        }

        // Enviar email
        const { data, error } = await resend.emails.send({
            from: 'Fuerza del Pueblo Europa <no-reply@centinelaelectoralsaeeuropa.com>',
            to: [to],
            subject: subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background: linear-gradient(135deg, #005c2b 0%, #00843f 100%);
                            color: white;
                            padding: 30px 20px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: #f9f9f9;
                            padding: 30px 20px;
                            border-radius: 0 0 10px 10px;
                        }
                        .message {
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #005c2b;
                            white-space: pre-wrap;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            font-size: 12px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin: 0; font-size: 24px;">Fuerza del Pueblo Europa</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Comunicación Oficial</p>
                    </div>
                    <div class="content">
                        <div class="message">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        <div class="footer">
                            <p><strong>Fuerza del Pueblo Europa</strong></p>
                            <p>Este es un correo automático del CRM Electoral. Por favor, no responder a este email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error('[Send Email] Resend API error:', error);
            return NextResponse.json({
                success: false,
                error: 'Error al enviar el email',
                details: error
            }, { status: 500 });
        }

        console.log(`[Send Email] ✅ Sent successfully: ${data?.id}`);

        // Guardar en tabla comunicaciones si se proporcionó afiliadoId
        if (afiliadoId) {
            try {
                const { error: dbError } = await supabaseAdmin
                    .from('comunicaciones')
                    .insert([{
                        afiliado_id: afiliadoId,
                        tipo: 'email',
                        asunto: subject,
                        contenido: message,
                        estado: 'enviado',
                        fecha_envio: new Date().toISOString(),
                        email_id: data?.id
                    }]);

                if (dbError) {
                    console.error('[Send Email] Error guardando en comunicaciones:', dbError);
                    // No fallar la request por esto
                }
            } catch (dbErr) {
                console.error('[Send Email] Exception guardando en comunicaciones:', dbErr);
            }
        }

        return NextResponse.json({
            success: true,
            emailId: data?.id,
            message: 'Email enviado correctamente'
        });

    } catch (error) {
        console.error('[Send Email] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: 'Error inesperado al procesar la solicitud'
        }, { status: 500 });
    }
}
