
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, email, asunto, mensaje } = body;

        // Validación básica
        if (!nombre || !email || !asunto || !mensaje) {
            return NextResponse.json(
                { error: 'Por favor completa todos los campos requeridos.' },
                { status: 400 }
            );
        }

        // Enviar correo a la administración
        const { data, error } = await resend.emails.send({
            from: 'Secretaría Asuntos Electorales <noreply@centinelaelectoralsaeeuropa.com>',
            to: ['info@centinelaelectoralsaeeuropa.com'],
            replyTo: email,
            subject: `[Contacto Web] ${asunto}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #005c2b; border-bottom: 2px solid #005c2b; padding-bottom: 10px;">Nuevo Mensaje de Contacto</h2>
                    
                    <p><strong>Nombre:</strong> ${nombre}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    <p><strong>Asunto:</strong> ${asunto}</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #666;">Mensaje:</h3>
                        <p style="white-space: pre-wrap;">${mensaje}</p>
                    </div>

                    <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                        Este mensaje fue enviado desde el formulario de contacto de Centinela Electoral.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("[Contact Form] Resend Error:", error);
            return NextResponse.json({ error: 'Error enviando el mensaje.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });

    } catch (error: any) {
        console.error("[Contact Form] Server Error:", error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
