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
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await loadUserProfile(session.user.email!, session.user.id);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.email!, session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (email: string, authId: string) => {
    try {
      // Try to get user from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
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
      } else if (error?.code === 'PGRST116') {
        // User doesn't exist, create one
        await createUserProfile(email, authId);
      } else {
        console.error('Error fetching user data:', error);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const createUserProfile = async (email: string, authId: string) => {
    try {
      const role = email === 'mudhirabu@gmail.com' ? 'admin' : 'viewer';
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authId,
          username: email.split('@')[0],
          email: email,
          role: role
        })
        .select()
        .single();

      if (!error && data) {
        setUser({
          id: data.id,
          name: data.username,
          email: data.email,
          role: data.role,
          avatar: '/avatar.png',
        });
      }
    } catch (err) {
      console.error('Error creating user profile:', err);
    }
  };

  const signup = async (email: string, password: string, username?: string, role: string = 'viewer'): Promise<boolean> => {
    try {
      console.log('Attempting signup for:', email);
      setLoading(true);

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
        return true;
      }

      throw new Error('Signup failed: No user returned');
    } catch (err) {
      console.error('Signup error:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      setLoading(true);

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
        return true;
      }

      throw new Error('Authentication failed: No user returned');
    } catch (err) {
      console.error('Login error:', err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user, loading }}>
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