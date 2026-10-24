export function mapAuthError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!navigator.onLine) {
    return 'You appear to be offline. Reconnect to the internet and try again.';
  }

  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('failed to fetch') || normalized.includes('network') || normalized.includes('fetch')) {
    return 'Network disconnected. Check your connection and try again.';
  }

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) {
    return 'Invalid email or password. Check your details and try again.';
  }

  if (normalized.includes('email not confirmed') || normalized.includes('not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the MUZ verification link.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }

  if (normalized.includes('password')) {
    return message;
  }

  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.';
  }

  return message || fallback;
}
