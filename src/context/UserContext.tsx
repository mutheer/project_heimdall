import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
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
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use refs to prevent duplicate auth state listeners and profile loads
  const authListenerRef = useRef<any>(null);
  const profileLoadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only initialize once
    if (isInitialized) return;
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing authentication...');
        
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session check error:', sessionError);
          setError('Failed to check authentication status');
          setLoading(false);
          setIsInitialized(true);
          return;
        }

        if (session?.user) {
          console.log('✅ Found existing session for:', session.user.email);
          await loadUserProfile(session.user.id, session.user.email!);
        } else {
          console.log('ℹ️ No existing session found');
          setLoading(false);
        }

        // Set up auth state listener (only once)
        if (!authListenerRef.current) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('🔄 Auth state change:', event, session?.user?.email);
              
              if (event === 'SIGNED_IN' && session?.user) {
                console.log('✅ User signed in, loading profile...');
                await loadUserProfile(session.user.id, session.user.email!);
              } else if (event === 'SIGNED_OUT') {
                console.log('👋 User signed out');
                setUser(null);
                setError(null);
                setLoading(false);
                // Clear any pending profile loads
                profileLoadingRef.current.clear();
              } else if (event === 'TOKEN_REFRESHED') {
                console.log('🔄 Token refreshed');
                // Don't reload profile on token refresh if user already exists
                if (!user && session?.user) {
                  await loadUserProfile(session.user.id, session.user.email!);
                }
              }
            }
          );
          
          authListenerRef.current = subscription;
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setError('Failed to initialize authentication');
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, [isInitialized]); // Only depend on isInitialized

  const loadUserProfile = async (userId: string, email: string) => {
    // Prevent duplicate profile loads for the same user
    const profileKey = `${userId}-${email}`;
    if (profileLoadingRef.current.has(profileKey)) {
      console.log('🔄 Profile already loading for:', email);
      return;
    }

    profileLoadingRef.current.add(profileKey);
    
    try {
      console.log('📋 Loading user profile for ID:', userId, 'Email:', email);
      
      // Use ID-based lookup instead of email to avoid case sensitivity issues
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, email, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('⚠️ User profile not found by ID, trying email:', error.message);
        
        // Fallback to email lookup if ID lookup fails
        const { data: emailUserData, error: emailError } = await supabase
          .from('users')
          .select('id, username, email, role')
          .eq('email', email)
          .single();

        if (emailError) {
          console.error('❌ User profile not found by email either:', emailError);
          
          // Check if this is an RLS issue (no error but no data)
          if (emailError.code === 'PGRST116') {
            console.warn('🔒 Possible RLS blocking profile read - user may not have permission');
            setError('Unable to load user profile. Please check permissions.');
          } else {
            console.error('💾 Database error loading user profile:', emailError);
            setError('Database error loading profile');
          }
          
          setUser(null);
          setLoading(false);
          return;
        }

        // Use email lookup result
        if (emailUserData) {
          console.log('✅ User profile loaded via email fallback:', {
            id: emailUserData.id,
            email: emailUserData.email,
            role: emailUserData.role,
            username: emailUserData.username
          });

          setUser({
            id: emailUserData.id,
            name: emailUserData.username || 'User',
            email: emailUserData.email,
            role: emailUserData.role,
            avatar: '/avatar.png',
          });
          setError(null);
          setLoading(false);
          return;
        }
      }

      if (!userData) {
        console.warn('⚠️ No user data found for ID:', userId, 'Email:', email);
        console.warn('🔒 This might be an RLS policy issue - check if user has permission to read their profile');
        setError('User profile not found. This may be a permissions issue.');
        setUser(null);
        setLoading(false);
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
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('❌ Exception in loadUserProfile:', err);
      setError('Failed to load user profile');
      setUser(null);
      setLoading(false);
    } finally {
      // Always remove from loading set
      profileLoadingRef.current.delete(profileKey);
    }
  };

  const signup = async (email: string, password: string, username?: string, role: string = 'viewer'): Promise<boolean> => {
    try {
      console.log('📝 Starting signup process for:', email);
      setError(null);
      setLoading(true);

      // Sign up with Supabase Auth - the handle_new_user trigger will create the profile
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
        setError(authError.message);
        setLoading(false);
        throw new Error(authError.message);
      }

      if (authData.user) {
        console.log('✅ Signup successful for:', email);
        console.log('User ID:', authData.user.id);
        console.log('Email confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');
        
        // The handle_new_user trigger will automatically create the user profile
        // The auth state change listener will handle loading the profile
        
        return true;
      }

      console.error('❌ Signup failed: No user returned');
      setError('Signup failed: No user returned');
      setLoading(false);
      throw new Error('Signup failed: No user returned');
    } catch (err) {
      console.error('❌ Signup exception:', err);
      setLoading(false);
      throw err;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Starting login process for:', email);
      setError(null);
      setLoading(true);

      // Use Supabase's standard authentication flow
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        console.error('❌ Auth sign-in error:', authError);
        setError('Invalid login credentials');
        setLoading(false);
        throw new Error('Invalid login credentials');
      }

      if (!authData.user) {
        console.error('❌ Authentication failed: No user returned');
        setError('Authentication failed');
        setLoading(false);
        throw new Error('Authentication failed: No user returned');
      }

      console.log('✅ Auth sign-in successful for:', authData.user.email);
      
      // The onAuthStateChange listener will handle setting the user state
      console.log('🔄 Waiting for auth state change to trigger profile loading...');
      
      return true;
    } catch (err) {
      console.error('❌ Login exception:', err);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Starting logout process...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error);
        setError('Logout failed');
      } else {
        console.log('✅ Logout successful');
      }
      
      // Force logout even if there's an error
      setUser(null);
      setError(null);
      setLoading(false);
      profileLoadingRef.current.clear();
    } catch (error) {
      console.error('❌ Logout exception:', error);
      // Force logout even if there's an error
      setUser(null);
      setError(null);
      setLoading(false);
      profileLoadingRef.current.clear();
    }
  };

  // Add debugging for user state changes (but prevent re-renders)
  useEffect(() => {
    if (user) {
      console.log('👤 User state updated:', {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      });
    } else {
      console.log('👤 User state cleared');
    }
  }, [user?.id, user?.email, user?.role]); // Only log when essential fields change

  const contextValue = {
    user,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    loading,
    error
  };

  return (
    <UserContext.Provider value={contextValue}>
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