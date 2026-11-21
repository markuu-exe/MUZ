import { describe, expect, it } from 'vitest';
import { readSupabaseConfig, SUPABASE_CONFIG_ERROR, supabaseConfigError } from '../config';

const EXPECTED =
  'MUZ configuration error: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see docs/ENVIRONMENTS.md).';

describe('supabaseConfigError (T-05, DEF-004)', () => {
  it('uses the documented message', () => {
    expect(SUPABASE_CONFIG_ERROR).toBe(EXPECTED);
  });

  it('reports an error when no Supabase variables are set', () => {
    expect(supabaseConfigError({})).toBe(EXPECTED);
  });

  it('reports an error when only the URL is set', () => {
    expect(supabaseConfigError({ VITE_SUPABASE_URL: 'http://example.test' })).toBe(EXPECTED);
  });

  it('reports an error when only the key is set', () => {
    expect(supabaseConfigError({ VITE_SUPABASE_ANON_KEY: 'k' })).toBe(EXPECTED);
  });

  it('treats empty and whitespace-only values as missing', () => {
    expect(supabaseConfigError({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: 'k' })).toBe(EXPECTED);
    expect(supabaseConfigError({ VITE_SUPABASE_URL: 'http://example.test', VITE_SUPABASE_ANON_KEY: '  ' })).toBe(
      EXPECTED,
    );
  });

  it('ignores non-string values such as the boolean DEV flag', () => {
    expect(supabaseConfigError({ VITE_SUPABASE_URL: true, VITE_SUPABASE_ANON_KEY: 'k' })).toBe(EXPECTED);
  });

  it('accepts the VITE_ names', () => {
    expect(supabaseConfigError({ VITE_SUPABASE_URL: 'http://example.test', VITE_SUPABASE_ANON_KEY: 'k' })).toBeNull();
  });

  it('accepts the NEXT_PUBLIC_ names the client already supports', () => {
    expect(
      supabaseConfigError({
        NEXT_PUBLIC_SUPABASE_URL: 'http://example.test',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'k',
      }),
    ).toBeNull();
  });

  it('accepts a mix of VITE_ and NEXT_PUBLIC_ names', () => {
    expect(
      supabaseConfigError({ VITE_SUPABASE_URL: 'http://example.test', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'k' }),
    ).toBeNull();
  });
});

describe('readSupabaseConfig', () => {
  it('returns null when misconfigured', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://example.test' })).toBeNull();
  });

  it('prefers the VITE_ names over the NEXT_PUBLIC_ names, as before', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: 'http://vite.test',
        NEXT_PUBLIC_SUPABASE_URL: 'http://next.test',
        VITE_SUPABASE_ANON_KEY: 'vite-key',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'next-key',
      }),
    ).toEqual({ url: 'http://vite.test', anonKey: 'vite-key' });
  });

  it('falls back to the NEXT_PUBLIC_ names when the VITE_ ones are empty', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_URL: 'http://next.test',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'next-key',
      }),
    ).toEqual({ url: 'http://next.test', anonKey: 'next-key' });
  });
});
