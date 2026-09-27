'use client';

import { create } from 'zustand';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminStore {
  isAuthenticated: boolean;
  token: string | null;
  user: AdminUser | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  checkAuth: () => void;
}

function safeLocalStorage() {
  if (typeof window === 'undefined') return null;
  return localStorage;
}

export const useAdminStore = create<AdminStore>((set) => ({
  isAuthenticated: false,
  token: null,
  user: null,

  login: (token, user) => {
    const ls = safeLocalStorage();
    if (ls) {
      ls.setItem('admin_token', token);
      ls.setItem('admin_user', JSON.stringify(user));
    }
    set({ isAuthenticated: true, token, user });
  },

  logout: () => {
    const ls = safeLocalStorage();
    if (ls) {
      ls.removeItem('admin_token');
      ls.removeItem('admin_user');
    }
    set({ isAuthenticated: false, token: null, user: null });
  },

  checkAuth: () => {
    const ls = safeLocalStorage();
    if (ls) {
      const token = ls.getItem('admin_token');
      const userStr = ls.getItem('admin_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as AdminUser;
          set({ isAuthenticated: true, token, user });
        } catch {
          ls.removeItem('admin_token');
          ls.removeItem('admin_user');
          set({ isAuthenticated: false, token: null, user: null });
        }
      }
    }
  },
}));
