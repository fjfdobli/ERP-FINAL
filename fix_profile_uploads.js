const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (file, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const { user } = state.auth;
      
      if (!user || !user.id) {
        return rejectWithValue('User not authenticated');
      }
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Try using the upsert option and public bucket
      // Force using public bucket access
      try {
        // Try to upload file to Supabase Storage with public access
        const { data, error } = await supabase.storage
          .from('profiles')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type // Add content type explicitly
          });
        
        if (error) {
          // Immediately fall back to local storage
          console.warn('Using local storage fallback for avatar:', error.message);
          return handleLocalAvatarFallback(file, dispatch);
        }
        
        // Get public URL for the file
        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);
        
        // Update user profile with the avatar URL
        await dispatch(updateUserProfile({ avatar: publicUrl })).unwrap();
        
        return publicUrl;
      } catch (storageError) {
        console.warn('Storage error, using fallback:', storageError);
        return handleLocalAvatarFallback(file, dispatch);
      }
    } catch (error) {
      console.error('Unexpected avatar upload error:', error);
      return rejectWithValue(error.message || 'Avatar upload failed');
    }
  }
);