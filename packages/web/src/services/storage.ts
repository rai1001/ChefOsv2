import { supabase } from '@/config/supabase';

/**
 * Uploads a file to Supabase Storage and returns the public download URL.
 *
 * @param file The file to upload
 * @param path The destination path in storage
 * @returns Promise<string> The download URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // path might be like 'folder/file.ext'. bucket needs to be decided.
    // We'll use a default bucket 'uploads' or 'public'
    const bucket = 'uploads'; // Check if this exists or create it in supabase setup

    const { error } = await supabase.storage.from(bucket).upload(path, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
};
