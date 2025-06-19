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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user details from public.users table
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && userData) {
            setUser({
              id: userData.id,
              name: userData.username || 'User',
              email: userData.email,
              role: userData.role,
              avatar: '/avatar.png',
            });
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Get user details from public.users table
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!error && userData) {
              setUser({
                id: userData.id,
                name: userData.username || 'User',
                email: userData.email,
                role: userData.role,
                avatar: '/avatar.png',
              });
            } else {
              console.error('Error fetching user data:', error);
            }
          } catch (err) {
            console.error('Error in auth state change:', err);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);

      // Use Supabase's standard authentication flow
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        console.error('Auth sign-in error:', authError.message);
        throw new Error('Invalid login credentials');
      }

      if (authData.user) {
        console.log('Auth sign-in successful');
        // The onAuthStateChange listener will handle setting the user state
        return true;
      }

      throw new Error('Authentication failed: No user returned');
    } catch (err) {
      console.error('Login error:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      setUser(null);
    }
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