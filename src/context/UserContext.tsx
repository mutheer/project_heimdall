import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  avatar: string;
}

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Set user from existing session
        setUser({
          id: session.user.id,
          name: 'Admin User',
          email: session.user.email || '',
          role: 'admin',
          avatar: '/avatar.png',
        });
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            name: 'Admin User',
            email: session.user.email || '',
            role: 'admin',
            avatar: '/avatar.png',
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // First verify admin credentials using the RPC function
      const { data: adminData, error: adminError } = await supabase
        .rpc('verify_admin', {
          email_input: email,
          password_input: password
        });

      if (adminError) {
        console.error('Admin verification error:', adminError.message);
        throw new Error(adminError.message);
      }

      // Explicitly check if adminData is true
      if (adminData === true) {
        // Create a Supabase auth session using signInWithPassword
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (authError) {
          console.error('Auth session error:', authError.message);
          throw new Error(authError.message);
        }

        if (authData.user) {
          setUser({
            id: authData.user.id,
            name: 'Admin User',
            email: authData.user.email || email,
            role: 'admin',
            avatar: '/avatar.png',
          });

          return true;
        }
      }

      console.error('Authentication failed');
      return false;
    } catch (err) {
      console.error('Login error:', err instanceof Error ? err.message : 'Unknown error');
      throw err; // Re-throw the error to be handled by the login form
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}