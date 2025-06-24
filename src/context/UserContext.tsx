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
        console.log('🔍 Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          return;
        }

        if (session?.user) {
          console.log('✅ Found existing session for:', session.user.email);
          await loadUserProfile(session.user.email!, session.user.id);
        } else {
          console.log('ℹ️ No existing session found');
        }
      } catch (error) {
        console.error('❌ Session check exception:', error);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in, loading profile...');
          await loadUserProfile(session.user.email!, session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createUserProfile = async (email: string, userId: string, username?: string, role?: string) => {
    try {
      console.log('📝 Creating user profile for:', email);
      
      // Determine role - check if this is an admin email
      const userRole = email === 'mudhirabu@gmail.com' || email === 'muthirabu@gmail.com' ? 'admin' : (role || 'viewer');
      
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            username: username || email.split('@')[0],
            email: email,
            role: userRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating user profile:', error);
        throw error;
      }

      console.log('✅ User profile created successfully:', data);
      return data;
    } catch (err) {
      console.error('❌ Exception in createUserProfile:', err);
      throw err;
    }
  };

  const loadUserProfile = async (email: string, userId: string) => {
    try {
      console.log('📋 Loading user profile for:', email, 'with ID:', userId);
      
      // First try to get the user profile
      let { data: userData, error } = await supabase
        .from('users')
        .select('id, username, email, role')
        .eq('email', email)
        .single();

      if (error) {
        console.warn('⚠️ User profile not found, attempting to create:', error.message);
        
        // If user doesn't exist, try to create it
        if (error.code === 'PGRST116') { // No rows returned
          try {
            userData = await createUserProfile(email, userId);
          } catch (createError) {
            console.error('❌ Failed to create user profile:', createError);
            
            // If creation fails, create a temporary user object
            console.log('🔄 Creating temporary user object');
            const tempUser = {
              id: userId,
              name: email.split('@')[0],
              email: email,
              role: (email === 'mudhirabu@gmail.com' || email === 'muthirabu@gmail.com') ? 'admin' as const : 'viewer' as const,
              avatar: '/avatar.png',
            };
            setUser(tempUser);
            return;
          }
        } else {
          console.error('❌ Database error loading user profile:', error);
          setUser(null);
          return;
        }
      }

      if (!userData) {
        console.warn('⚠️ No user data found for email:', email);
        setUser(null);
        return;
      }

      console.log('✅ User profile loaded successfully:', {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        username: userData.username
      });

      setUser({
        id: userData.id,
        name: userData.username || 'User',
        email: userData.email,
        role: userData.role,
        avatar: '/avatar.png',
      });
    } catch (err) {
      console.error('❌ Exception in loadUserProfile:', err);
      
      // Create fallback user for admin emails
      if (email === 'mudhirabu@gmail.com' || email === 'muthirabu@gmail.com') {
        console.log('🔄 Creating fallback admin user');
        setUser({
          id: userId,
          name: 'Admin User',
          email: email,
          role: 'admin',
          avatar: '/avatar.png',
        });
      } else {
        setUser(null);
      }
    }
  };

  const signup = async (email: string, password: string, username?: string, role: string = 'viewer'): Promise<boolean> => {
    try {
      console.log('📝 Starting signup process for:', email);

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
        console.error('❌ Auth signup error:', authError);
        console.error('Auth error details:', {
          code: authError.code,
          message: authError.message
        });
        throw new Error(authError.message);
      }

      if (authData.user) {
        console.log('✅ Signup successful for:', email);
        console.log('User ID:', authData.user.id);
        console.log('Email confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');
        
        // Try to create user profile immediately
        if (authData.user.email_confirmed_at) {
          await createUserProfile(email, authData.user.id, username, role);
        }
        
        return true;
      }

      console.error('❌ Signup failed: No user returned');
      throw new Error('Signup failed: No user returned');
    } catch (err) {
      console.error('❌ Signup exception:', err);
      throw err;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Starting login process for:', email);
      console.log('Login attempt timestamp:', new Date().toISOString());

      // Use Supabase's standard authentication flow
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        console.error('❌ Auth sign-in error:', authError);
        console.error('Auth error details:', {
          code: authError.code,
          message: authError.message,
          status: authError.status
        });
        
        // Log specific error types
        if (authError.message.includes('Invalid login credentials')) {
          console.error('🔑 Invalid credentials provided');
        } else if (authError.message.includes('Email not confirmed')) {
          console.error('📧 Email not confirmed');
        } else if (authError.message.includes('Too many requests')) {
          console.error('⏰ Rate limited');
        }
        
        throw new Error('Invalid login credentials');
      }

      if (!authData.user) {
        console.error('❌ Authentication failed: No user returned');
        throw new Error('Authentication failed: No user returned');
      }

      console.log('✅ Auth sign-in successful for:', authData.user.email);
      console.log('User details:', {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at ? 'Yes' : 'No',
        lastSignIn: authData.user.last_sign_in_at
      });

      if (authData.session) {
        console.log('✅ Session created successfully');
        console.log('Session details:', {
          accessToken: authData.session.access_token ? 'Present' : 'Missing',
          refreshToken: authData.session.refresh_token ? 'Present' : 'Missing',
          expiresAt: authData.session.expires_at,
          expiresIn: authData.session.expires_in
        });
      } else {
        console.warn('⚠️ No session created');
      }

      // The onAuthStateChange listener will handle setting the user state
      console.log('🔄 Waiting for auth state change to trigger profile loading...');
      
      // Add a small delay to ensure the auth state change is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (err) {
      console.error('❌ Login exception:', err);
      console.error('Exception details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Starting logout process...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error);
      } else {
        console.log('✅ Logout successful');
      }
      
      // Force logout even if there's an error
      setUser(null);
    } catch (error) {
      console.error('❌ Logout exception:', error);
      // Force logout even if there's an error
      setUser(null);
    }
  };

  // Add debugging for user state changes
  useEffect(() => {
    console.log('👤 User state changed:', user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    } : 'null');
  }, [user]);

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