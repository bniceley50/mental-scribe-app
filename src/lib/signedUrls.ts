/**
 * Signed URL utilities for secure file access
 * SECURITY: Always use signed URLs for PHI documents, never public URLs
 */

import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 60; // 60 seconds for PHI documents (HIPAA compliance)

/**
 * Generate a signed URL for a file in storage
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Signed URL or null if failed
 */
export const generateSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

/**
 * Refresh signed URLs for files
 * Call this when URLs are about to expire
 */
export const refreshFileUrl = async (
  fileUrl: string,
  bucket: string = "clinical-documents"
): Promise<string | null> => {
  try {
    // Extract path from existing URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const path = pathParts.slice(pathParts.indexOf('object') + 2).join('/');

    return await generateSignedUrl(bucket, path);
  } catch (error) {
    console.error('Error refreshing file URL:', error);
    return null;
  }
};
