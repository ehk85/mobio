import { env } from '../config/env';
import type { UserAccount } from '../types';

const STORAGE_KEY = 'mobio_user';
export const AUTH_STATE_CHANGED_EVENT = 'mobio-auth-state-changed';

export const getCurrentUser = (): UserAccount | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
};

const saveUser = (user: UserAccount | null) => {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
};

export const signUp = async (email: string, password: string, displayName: string): Promise<UserAccount> => {
  try {
    const response = await fetch(`${env.authServerUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? 'Inscription impossible.');
    }

    const user = (await response.json()) as UserAccount;
    saveUser(user);
    return user;
  } catch {
    throw new Error('Inscription impossible. Vérifiez le serveur MongoDB/API.');
  }
};

export const signIn = async (email: string, password: string): Promise<UserAccount> => {
  try {
    const response = await fetch(`${env.authServerUrl}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? 'Connexion impossible.');
    }

    const user = (await response.json()) as UserAccount;
    saveUser(user);
    return user;
  } catch {
    throw new Error('Connexion impossible. Vérifiez le serveur MongoDB/API.');
  }
};

export const signOut = () => {
  saveUser(null);
};
