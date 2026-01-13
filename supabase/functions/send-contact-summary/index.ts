import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: messages, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const messagesHtml = messages?.map((msg: any) => `
      <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
        <p><strong>Datum:</strong> ${new Date(msg.created_at).toLocaleString('sv-SE')}</p>
        <p><strong>Från:</strong> ${msg.name} (${msg.email})</p>
        <p><strong>Ämne:</strong> ${msg.subject}</p>
        <p><strong>Meddelande:</strong></p>
        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 4px;">${msg.message}</p>
      </div>
    `).join('') || '<p>Inga meddelanden hittades.</p>';

    const emailResponse = await resend.emails.send({
      from: "Gymdagboken <noreply@gymdagboken.se>",
      to: ["info@gymdagboken.se"],
      subject: `Sammanställning: ${messages?.length || 0} kontaktmeddelanden`,
      html: `
        <h1>Alla kontaktmeddelanden</h1>
        <p>Totalt ${messages?.length || 0} meddelanden i databasen.</p>
        <hr>
        ${messagesHtml}
      `,
    });

    console.log('Summary email sent:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, count: messages?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
