import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RegistrationStartRequest {
  deviceName: string;
}

interface RegistrationCompleteRequest {
  challenge: string;
  credentialId: string;
  publicKey: string;
  transports?: string[];
  deviceName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Start registration - generate challenge
    if (path.endsWith('/start') && req.method === 'POST') {
      const { deviceName }: RegistrationStartRequest = await req.json();

      // Generate a random challenge (32 bytes)
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Store challenge in database
      const { error: insertError } = await supabase
        .from('passkey_challenges')
        .insert({
          user_id: user.id,
          challenge,
          type: 'registration',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        throw new Error('Failed to store challenge');
      }

      // Return challenge options for WebAuthn
      const options = {
        challenge,
        rp: {
          name: 'Carpool Network',
          id: new URL(supabaseUrl).hostname,
        },
        user: {
          id: user.id,
          name: user.email || user.phone || user.id,
          displayName: deviceName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'preferred',
        },
      };

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Complete registration - verify and store credential
    if (path.endsWith('/complete') && req.method === 'POST') {
      const {
        challenge,
        credentialId,
        publicKey,
        transports = [],
        deviceName,
      }: RegistrationCompleteRequest = await req.json();

      // Verify challenge exists and hasn't expired
      const { data: challengeData, error: challengeError } = await supabase
        .from('passkey_challenges')
        .select('*')
        .eq('challenge', challenge)
        .eq('user_id', user.id)
        .eq('type', 'registration')
        .single();

      if (challengeError || !challengeData) {
        throw new Error('Invalid or expired challenge');
      }

      if (new Date(challengeData.expires_at) < new Date()) {
        throw new Error('Challenge has expired');
      }

      // Store the credential
      const { error: credentialError } = await supabase
        .from('passkey_credentials')
        .insert({
          user_id: user.id,
          credential_id: credentialId,
          public_key: publicKey,
          counter: 0,
          device_name: deviceName,
          transports,
        });

      if (credentialError) {
        throw new Error('Failed to store credential');
      }

      // Delete the challenge
      await supabase
        .from('passkey_challenges')
        .delete()
        .eq('id', challengeData.id);

      return new Response(JSON.stringify({ success: true }), {
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