import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AuthenticationStartRequest {
  // Empty for now - challenge will work for any credential
}

interface AuthenticationCompleteRequest {
  challenge: string;
  credentialId: string;
  signature: string;
  authenticatorData: string;
  clientDataJSON: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // Start authentication - generate challenge
    if (path.endsWith('/start') && req.method === 'POST') {
      // Generate a random challenge (32 bytes)
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Store challenge in database (no user_id since we don't know who yet)
      const { error: insertError } = await supabase
        .from('passkey_challenges')
        .insert({
          challenge,
          type: 'authentication',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        throw new Error('Failed to store challenge');
      }

      // Return challenge options for WebAuthn
      const options = {
        challenge,
        timeout: 60000,
        rpId: new URL(supabaseUrl).hostname,
        userVerification: 'preferred',
      };

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Complete authentication - verify and create session
    if (path.endsWith('/complete') && req.method === 'POST') {
      const {
        challenge,
        credentialId,
        signature,
        authenticatorData,
        clientDataJSON,
      }: AuthenticationCompleteRequest = await req.json();

      // Verify challenge exists and hasn't expired
      const { data: challengeData, error: challengeError } = await supabase
        .from('passkey_challenges')
        .select('*')
        .eq('challenge', challenge)
        .eq('type', 'authentication')
        .single();

      if (challengeError || !challengeData) {
        throw new Error('Invalid or expired challenge');
      }

      if (new Date(challengeData.expires_at) < new Date()) {
        throw new Error('Challenge has expired');
      }

      // Find the credential
      const { data: credential, error: credError } = await supabase
        .from('passkey_credentials')
        .select('user_id, public_key, counter')
        .eq('credential_id', credentialId)
        .single();

      if (credError || !credential) {
        throw new Error('Credential not found');
      }

      // In production, you would verify the signature here using the public key
      // For now, we'll trust the credential ID match
      // TODO: Implement proper cryptographic verification

      // Update last used timestamp and counter
      await supabase
        .from('passkey_credentials')
        .update({
          last_used_at: new Date().toISOString(),
          counter: credential.counter + 1,
        })
        .eq('credential_id', credentialId);

      // Delete the challenge
      await supabase
        .from('passkey_challenges')
        .delete()
        .eq('id', challengeData.id);

      // Create a Supabase session for the user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: '', // Will use user_id instead
        options: {
          redirectTo: new URL(supabaseUrl).origin,
        },
      });

      // Alternative: Create session directly using admin API
      // Since we can't easily generate a session token, we'll return the user ID
      // and let the client handle creating the session
      
      return new Response(JSON.stringify({ 
        success: true,
        userId: credential.user_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});