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

      // First verify admin credentials using the RPC function
      const { data: adminData, error: adminError } = await supabase
        .rpc('verify_admin', {
          email_input: email,
          password_input: password
        });

      if (adminError) {
        console.error('Admin verification error:', adminError.message);
        throw new Error('Invalid credentials');
      }

      // Check if admin verification was successful
      if (adminData !== true) {
        console.error('Admin verification failed');
        throw new Error('Invalid credentials');
      }

      console.log('Admin verification successful');

      // Check if user exists in auth.users
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        console.error('Auth sign-in error:', authError.message);
        
        // If the auth user doesn't exist but admin verification passed,
        // we need to create the auth user
        if (authError.message.includes('Invalid login credentials')) {
          console.log('Auth user not found, creating auth user...');
          
          // Get the admin record to use the same ID
          const { data: adminRecord, error: adminFetchError } = await supabase
            .from('admins')
            .select('id')
            .eq('email', email)
            .single();

          if (adminFetchError || !adminRecord) {
            throw new Error('Admin record not found');
          }

          // Create auth user with the same ID as the admin record
          const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            user_id: adminRecord.id,
            email_confirm: true,
            user_metadata: {
              role: 'admin'
            }
          });

          if (signUpError) {
            console.error('Failed to create auth user:', signUpError.message);
            throw new Error('Failed to create authentication session');
          }

          if (signUpData.user) {
            console.log('Auth user created successfully');
            
            // Now try to sign in again
            const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
              email: email,
              password: password
            });

            if (retryAuthError) {
              throw new Error('Authentication failed after user creation');
            }

            return true;
          }
        }
        
        throw new Error('Authentication failed');
      }

      if (authData.user) {
        console.log('Auth sign-in successful');
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