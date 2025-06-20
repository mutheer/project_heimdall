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
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
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
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (email: string) => {
    try {
      // First try to get user from users table
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
      } else {
        console.error('Error fetching user data:', error);
        // If user doesn't exist in users table, create one
        if (error.code === 'PGRST116') {
          await createUserProfile(email);
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const createUserProfile = async (email: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user) {
        const { data, error } = await supabase
          .from('users')
          .insert({
            id: authUser.user.id,
            username: email.split('@')[0],
            email: email,
            role: 'viewer'
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
      }
    } catch (err) {
      console.error('Error creating user profile:', err);
    }
  };

  const signup = async (email: string, password: string, username?: string, role: string = 'viewer'): Promise<boolean> => {
    try {
      console.log('Attempting signup for:', email);
      setLoading(true);

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

      // Add timeout to prevent infinite loading
      const loginPromise = supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 10000); // 10 second timeout
      });

      const { data: authData, error: authError } = await Promise.race([
        loginPromise,
        timeoutPromise
      ]) as any;

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
      // Force logout even if there's an error
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Don't render children until we've checked the session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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