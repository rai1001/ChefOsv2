import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
// import { Resend } from 'resend';
import { initializeApp } from 'firebase-admin/app';

initializeApp(); // Ensure initialized if not already

// Initialize Resend
// const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export const onInvitationCreated = onDocumentCreated(
  'invitations/{invitationId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.error('No data associated with the event');
      return;
    }

    const invitation = snapshot.data();
    // const invitationId = snapshot.id;
    const { email, role } = invitation;

    console.log(`Processing invitation for ${email} (${role})`);

    try {
      // Construct the invitation link (placeholder URL for now)
      // ideally: https://app.chefos.com/register?inviteId=${invitationId}&email=${email}
      // const inviteLink = `https://chefos-v2.web.app/register?inviteId=${invitationId}&email=${encodeURIComponent(email)}`;

      /*
      const emailHtml = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; padding: 20px; background-color: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h1 style="color: #4f46e5; margin-bottom: 24px;">Has sido invitado a ChefOS</h1>
                    <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                        Hola,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                        Se ha creado una cuenta para ti con el rol de <strong>${role}</strong>.
                    </p>
                    <div style="margin: 32px 0; text-align: center;">
                        <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                            Aceptar Invitación
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Si no esperabas este correo, puedes ignorarlo.
                    </p>
                </div>
            </body>
            </html>
        `;

      try {
        await resend.emails.send({
          from: 'ChefOS <invitations@chefos.app>',
          to: email,
          subject: 'Invitación a ChefOS - Kitchen Manager',
          html: emailHtml,
        });
        console.log(`Invitation email sent to ${email}`);
      } catch (emailError: any) {
        console.warn(`Failed to send email to ${email}, but continuing:`, emailError.message);
      }
      */

      // Update status to 'sent'
      await snapshot.ref.update({
        status: 'sent',
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error processing invitation:', error);
      await snapshot.ref.update({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
