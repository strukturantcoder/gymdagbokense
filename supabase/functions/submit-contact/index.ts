import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 submissions per hour per IP

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  record.count++;
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    console.log(`Contact form submission from IP: ${clientIP.substring(0, 10)}...`);

    // Check rate limit
    if (isRateLimited(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP.substring(0, 10)}...`);
      return new Response(
        JSON.stringify({ error: 'För många förfrågningar. Försök igen senare.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { name, email, subject, message } = await req.json();

    // Server-side validation
    if (!name || !email || !subject || !message) {
      console.log('Validation failed: missing fields');
      return new Response(
        JSON.stringify({ error: 'Alla fält måste fyllas i.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate field lengths
    if (name.length > 100 || email.length > 255 || subject.length > 200 || message.length > 5000) {
      console.log('Validation failed: field too long');
      return new Response(
        JSON.stringify({ error: 'Ett eller flera fält är för långa.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Validation failed: invalid email');
      return new Response(
        JSON.stringify({ error: 'Ogiltig e-postadress.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role (can bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert the contact message
    const { error } = await supabaseAdmin.from('contact_messages').insert({
      name: name.trim().substring(0, 100),
      email: email.trim().toLowerCase().substring(0, 255),
      subject: subject.trim().substring(0, 200),
      message: message.trim().substring(0, 5000),
    });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Contact message saved successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Meddelande skickat!' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in submit-contact function:', error);
    return new Response(
      JSON.stringify({ error: 'Kunde inte skicka meddelandet. Försök igen senare.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
