type OtpErrorLike = {
  message?: string;
  status?: number;
  code?: string;
};

export const getAllowOtpSignups = () => {
  const explicit = import.meta.env.VITE_AUTH_ALLOW_OTP_SIGNUPS;
  if (typeof explicit === 'string') {
    return explicit === 'true';
  }
  return import.meta.env.VITE_BETA_MODE === 'true' ? false : true;
};

export const getOtpErrorMessage = (error: unknown, allowOtpSignups: boolean) => {
  if (!error) return null;

  const message =
    error instanceof Error
      ? error.message
      : (error as OtpErrorLike)?.message || String(error);

  const normalized = message.toLowerCase();
  const code = (error as OtpErrorLike)?.code;
  const status = (error as OtpErrorLike)?.status;

  if (
    normalized.includes('signups not allowed for otp') ||
    normalized.includes('signups not allowed') ||
    code === 'signup_disabled' ||
    status === 403
  ) {
    return "This phone/email isn't registered yet. Signups are currently disabled. Please use an existing account or contact support.";
  }

  if (normalized.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment.';
  }

  const providerKeywords = ['sms', 'phone provider', 'email provider', 'otp'];
  const hasProviderKeyword = providerKeywords.some((keyword) => normalized.includes(keyword));
  const configKeywords = ['not enabled', 'not configured', 'disabled'];
  const hasConfigKeyword = configKeywords.some((keyword) => normalized.includes(keyword));

  if (allowOtpSignups && hasProviderKeyword && hasConfigKeyword) {
    return 'OTP is not configured yet. Admin: enable Phone provider + SMS in Supabase Auth settings.';
  }

  return null;
};
