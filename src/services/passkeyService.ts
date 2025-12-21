import { supabase } from '../lib/supabase';

/**
 * Check if WebAuthn/Passkeys are supported in this browser
 */
export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' &&
         window.PublicKeyCredential !== undefined &&
         typeof window.PublicKeyCredential === 'function';
}

/**
 * Convert base64url string to ArrayBuffer
 */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64url string
 */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Register a new passkey for the current user
 */
export async function registerPasskey(deviceName: string): Promise<void> {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }

  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('You must be signed in to register a passkey');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-register/start`;

  // Step 1: Get registration options from the server
  const startResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceName }),
  });

  if (!startResponse.ok) {
    const error = await startResponse.json();
    throw new Error(error.error || 'Failed to start passkey registration');
  }

  const options = await startResponse.json();

  // Step 2: Convert challenge and user.id to ArrayBuffer
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: base64urlToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation as AttestationConveyancePreference,
    authenticatorSelection: options.authenticatorSelection,
  };

  // Step 3: Create the credential
  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Failed to create passkey credential');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  // Extract the public key from the attestation object
  // In production, parse the COSE key properly
  const publicKeyBuffer = response.getPublicKey();
  const publicKey = publicKeyBuffer ? bufferToBase64url(publicKeyBuffer) : '';

  // Step 4: Send credential to server
  const completeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-register/complete`;
  const completeResponse = await fetch(completeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      challenge: options.challenge,
      credentialId: bufferToBase64url(credential.rawId),
      publicKey,
      transports: response.getTransports?.() || [],
      deviceName,
    }),
  });

  if (!completeResponse.ok) {
    const error = await completeResponse.json();
    throw new Error(error.error || 'Failed to complete passkey registration');
  }
}

/**
 * Authenticate using a passkey
 */
export async function authenticateWithPasskey(): Promise<void> {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-authenticate/start`;

  // Step 1: Get authentication options from the server
  const startResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  if (!startResponse.ok) {
    const error = await startResponse.json();
    throw new Error(error.error || 'Failed to start passkey authentication');
  }

  const options = await startResponse.json();

  // Step 2: Convert challenge to ArrayBuffer
  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    userVerification: options.userVerification as UserVerificationRequirement,
  };

  // Step 3: Get the credential
  const credential = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Failed to get passkey credential');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  // Step 4: Send assertion to server
  const completeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-authenticate/complete`;
  const completeResponse = await fetch(completeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      challenge: options.challenge,
      credentialId: bufferToBase64url(credential.rawId),
      signature: bufferToBase64url(response.signature),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
    }),
  });

  if (!completeResponse.ok) {
    const error = await completeResponse.json();
    throw new Error(error.error || 'Failed to complete passkey authentication');
  }

  const result = await completeResponse.json();

  // Note: In a production implementation, you would need to create a proper
  // Supabase session here. The current implementation returns a userId,
  // but Supabase needs proper token exchange to create a session.
  // This is a limitation that would require additional backend logic.

  throw new Error('Passkey authentication successful, but session creation is not yet implemented. Please use password or OTP authentication for now.');
}

/**
 * Get list of registered passkeys for the current user
 */
export async function getPasskeys(): Promise<Array<{
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string;
}>> {
  const { data, error } = await supabase
    .from('passkey_credentials')
    .select('id, device_name, created_at, last_used_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Delete a registered passkey
 */
export async function deletePasskey(id: string): Promise<void> {
  const { error } = await supabase
    .from('passkey_credentials')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}
