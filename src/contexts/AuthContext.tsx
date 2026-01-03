import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isEmailVerified: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: AuthError | null; requiresEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithFacebook: () => Promise<{ error: AuthError | null }>;
  signInWithOTP: (emailOrPhone: string, isPhone?: boolean) => Promise<{ error: AuthError | null }>;
  verifyOTP: (emailOrPhone: string, token: string, isPhone?: boolean) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  resendVerificationEmail: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      supabase.realtime.setAuth(session?.access_token || '');
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  const loadProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const fallbackEmail = user.email || `phone-${(user.phone || user.id).replace(/[^0-9A-Za-z]/g, '')}@carpoolnetwork.co.uk`;
        const fallbackName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          'New User';

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: fallbackEmail,
            full_name: fallbackName,
            phone: user.phone || null,
          }])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(createdProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };
  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      if (import.meta.env.VITE_BETA_MODE === 'true') {
        const { data: isAllowlisted, error: allowlistError } = await supabase.rpc(
          'check_beta_allowlist',
          { check_email: email }
        );

        if (allowlistError) {
          return { error: new AuthError('Unable to verify beta access. Please try again.'), requiresEmailConfirmation: false };
        }

        if (!isAllowlisted) {
          return { error: new AuthError('This email is not on the beta allowlist.'), requiresEmailConfirmation: false };
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return { error, requiresEmailConfirmation: false };
      if (!data.user) return { error: new AuthError('User creation failed'), requiresEmailConfirmation: false };

      const requiresEmailConfirmation = !data.session;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          phone: phone,
        }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      return { error: null, requiresEmailConfirmation };
    } catch (error) {
      return { error: error as AuthError, requiresEmailConfirmation: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signInWithOTP = async (emailOrPhone: string, isPhone = false) => {
    try {
      if (isPhone) {
        const { error } = await supabase.auth.signInWithOtp({
          phone: emailOrPhone,
        });
        return { error };
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailOrPhone,
          options: {
            shouldCreateUser: false,
          },
        });
        return { error };
      }
    } catch (err) {
      return { error: err as AuthError };
    }
  };

  const verifyOTP = async (emailOrPhone: string, token: string, isPhone = false) => {
    try {
      if (isPhone) {
        const { error } = await supabase.auth.verifyOtp({
          phone: emailOrPhone,
          token,
          type: 'sms',
        });
        return { error };
      } else {
        const { error } = await supabase.auth.verifyOtp({
          email: emailOrPhone,
          token,
          type: 'email',
        });
        return { error };
      }
    } catch (err) {
      return { error: err as AuthError };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return { error: new AuthError('No email address') };

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    return { error };
  };

  const isEmailVerified = !!user?.email_confirmed_at;
  const isAdmin = profile?.is_admin === true;

  const value = {
    user,
    profile,
    session,
    loading,
    isEmailVerified,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signInWithOTP,
    verifyOTP,
    signOut,
    resetPassword,
    updateProfile,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
