const PERSIST_FLAG = 'muz-persist-session';

export function setAuthPersistPreference(keepSignedIn: boolean) {
  localStorage.setItem(PERSIST_FLAG, keepSignedIn ? '1' : '0');
}

function shouldPersist(): boolean {
  return localStorage.getItem(PERSIST_FLAG) !== '0';
}

/** Routes Supabase auth tokens to localStorage or sessionStorage based on "Keep me signed in". */
export const authStorage = {
  getItem: (key: string) => {
    const primary = shouldPersist() ? localStorage : sessionStorage;
    return primary.getItem(key) ?? localStorage.getItem(key) ?? sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (shouldPersist()) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
