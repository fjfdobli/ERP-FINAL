import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

interface User {
  id: number;
  auth_id: string;
  email: string | undefined;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  jobTitle?: string;
  settings?: UserSettings;
}

interface UserSettings {
  emailNotifications?: boolean;
  appNotifications?: boolean;
  darkMode?: boolean;
  language?: string;
  theme?: string;
  twoFactorAuth?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null
};

const getOrCreateUserProfile = async (authUser: any) => {
  if (!authUser) return null;
  
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { 
      console.error('Error fetching user profile:', fetchError);
      throw new Error(`Error fetching user profile: ${fetchError.message}`);
    }

    if (existingProfile) {
      return {
        id: existingProfile.id,
        auth_id: authUser.id,
        email: authUser.email,
        firstName: authUser.user_metadata?.firstName || existingProfile.first_name,
        lastName: authUser.user_metadata?.lastName || existingProfile.last_name,
        role: existingProfile.role,
        phone: existingProfile.phone,
        jobTitle: existingProfile.job_title,
        settings: existingProfile.settings
      };
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert([
        { 
          auth_user_id: authUser.id, 
          first_name: authUser.user_metadata?.firstName || '',
          last_name: authUser.user_metadata?.lastName || '',
          email: authUser.email
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      throw new Error(`Error creating user profile: ${insertError.message}`);
    }

    return {
      id: newProfile.id,
      auth_id: authUser.id,
      email: authUser.email,
      firstName: authUser.user_metadata?.firstName || newProfile.first_name,
      lastName: authUser.user_metadata?.lastName || newProfile.last_name,
      role: newProfile.role,
      phone: newProfile.phone,
      jobTitle: newProfile.job_title,
      settings: newProfile.settings
    };
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    return {
      id: 0,
      auth_id: authUser.id,
      email: authUser.email,
      firstName: authUser.user_metadata?.firstName,
      lastName: authUser.user_metadata?.lastName,
    };
  }
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error);
        return rejectWithValue(error.message);
      }
      
      if (!data?.session?.access_token) {
        return rejectWithValue('Invalid response format from server');
      }
      
      localStorage.setItem('token', data.session.access_token);
      
      try {
        const userProfile = await getOrCreateUserProfile(data.user);
        return { 
          session: data.session, 
          user: userProfile 
        };
      } catch (profileError: any) {
        console.error('Profile error during login:', profileError);
        return { 
          session: data.session, 
          user: {
            id: 0,
            auth_id: data.user.id,
            email: data.user.email,
            firstName: data.user.user_metadata?.firstName,
            lastName: data.user.user_metadata?.lastName,
          }
        };
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, firstName, lastName }: { 
    email: string; 
    password: string;
    firstName?: string;
    lastName?: string;
  }, { rejectWithValue }) => {
    try {
      console.log('Registering user:', { email, firstName, lastName });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName
          }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        return rejectWithValue(error.message);
      }
      
      if (!data?.user) {
        return rejectWithValue('Registration successful but no user data returned');
      }
      
      console.log('Registration successful:', data);
      
      return data;
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        localStorage.removeItem('token');
        return rejectWithValue(error?.message || 'User not authenticated');
      }
      
      try {
        const userProfile = await getOrCreateUserProfile(data.user);
        return userProfile;
      } catch (profileError: any) {
        console.error('Profile error in getCurrentUser:', profileError);
        return {
          id: 0,
          auth_id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.firstName,
          lastName: data.user.user_metadata?.lastName,
        };
      }
    } catch (error: any) {
      localStorage.removeItem('token');
      return rejectWithValue(error.message || 'Failed to get user');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData: Partial<User>, { getState, rejectWithValue }) => {
    try {
      const state: any = getState();
      const { user } = state.auth;
      
      if (!user || !user.id) {
        return rejectWithValue('User not authenticated');
      }
      
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          firstName: profileData.firstName,
          lastName: profileData.lastName
        }
      });
      
      if (authUpdateError) {
        console.error('Error updating auth metadata:', authUpdateError);
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          job_title: profileData.jobTitle
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user profile:', error);
        return rejectWithValue(error.message);
      }
      
      return {
        ...user,
        firstName: profileData.firstName || user.firstName,
        lastName: profileData.lastName || user.lastName,
        phone: profileData.phone || user.phone,
        jobTitle: profileData.jobTitle || user.jobTitle
      };
    } catch (error: any) {
      console.error('Unexpected profile update error:', error);
      return rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

export const updateUserSettings = createAsyncThunk(
  'auth/updateUserSettings',
  async (settings: UserSettings, { getState, rejectWithValue }) => {
    try {
      const state: any = getState();
      const { user } = state.auth;
      
      if (!user || !user.id) {
        return rejectWithValue('User not authenticated');
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          settings: settings
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user settings:', error);
        return rejectWithValue(error.message);
      }
      
      return {
        ...user,
        settings
      };
    } catch (error: any) {
      console.error('Unexpected settings update error:', error);
      return rejectWithValue(error.message || 'Settings update failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      supabase.auth.signOut();
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setMockAuthState: (state) => {
      state.user = {
        id: 1,
        auth_id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      };
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.session.access_token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      .addCase(updateUserSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateUserSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { logout, clearError, setMockAuthState, setUser } = authSlice.actions;
export default authSlice.reducer;