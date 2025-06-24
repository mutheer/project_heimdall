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
  signup: (email: string, password: string, username?: string, role?: string) => Promise<boolean>;
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
          await loadUserProfile(session.user.email!);
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
          await loadUserProfile(session.user.email!);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (email: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, email, role') // Only select essential columns
        .eq('email', email)
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
      console.error('Error loading user profile:', err);
    }
  };

  const signup = async (email: string, password: string, username?: string, role: string = 'viewer'): Promise<boolean> => {
    try {
      console.log('Attempting signup for:', email);

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username || email.split('@')[0],
            role: role
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError.message);
        throw new Error(authError.message);
      }

      if (authData.user) {
        console.log('Signup successful');
        // The trigger will handle creating the user profile
        // If email confirmation is disabled, the user will be signed in automatically
        return true;
      }

      throw new Error('Signup failed: No user returned');
    } catch (err) {
      console.error('Signup error:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

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
    <UserContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
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