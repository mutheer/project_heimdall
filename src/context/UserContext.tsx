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
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('Auth initialization timeout, setting loading to false');
            setLoading(false);
          }
        }, 5000);

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('Found existing session for:', session.user.email);
          await loadUserProfile(session.user.email!, session.user.id);
        }
        
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.email);
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            await loadUserProfile(session.user.email!, session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (email: string, authId: string) => {
    try {
      console.log('Loading user profile for:', email);
      
      // For admin user, create a simple profile without database query
      if (email === 'mudhirabu@gmail.com') {
        setUser({
          id: authId,
          name: 'Admin User',
          email: email,
          role: 'admin',
          avatar: '/avatar.png',
        });
        return;
      }

      // For other users, try to load from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (userData) {
        setUser({
          id: userData.id,
          name: userData.username || 'User',
          email: userData.email,
          role: userData.role,
          avatar: '/avatar.png',
        });
      } else if (!error || error.code === 'PGRST116') {
        // User doesn't exist, create a simple profile
        setUser({
          id: authId,
          name: email.split('@')[0],
          email: email,
          role: 'viewer',
          avatar: '/avatar.png',
        });
      } else {
        console.error('Error loading user profile:', error);
        // Still set a basic user profile to prevent blocking
        setUser({
          id: authId,
          name: email.split('@')[0],
          email: email,
          role: 'viewer',
          avatar: '/avatar.png',
        });
      }
    } catch (err) {
      console.error('Error in loadUserProfile:', err);
      // Set a basic user profile to prevent blocking
      setUser({
        id: authId,
        name: email.split('@')[0],
        email: email,
        role: email === 'mudhirabu@gmail.com' ? 'admin' : 'viewer',
        avatar: '/avatar.png',
      });
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