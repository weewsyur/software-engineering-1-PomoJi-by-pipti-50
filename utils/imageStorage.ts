// ─── imageStorage.ts ─────────────────────────────────────────────────────
// Firebase Storage utilities for activity and profile images
// Handles uploading images and generating fresh download URLs

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';
import * as FileSystem from 'expo-file-system';

/**
 * Upload an image to Firebase Storage
 * @param userId - User ID for the storage path
 * @param imageUri - Local URI of the image to upload
 * @param activityId - Optional activity ID for organizing images
 * @returns Storage path (not download URL)
 */
export async function uploadActivityImage(
  userId: string,
  imageUri: string,
  activityId?: string
): Promise<string> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Image file not found');
    }

    if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
      throw new Error('Image too large. Please upload an image under 5MB');
    }

    const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const contentType = mimeMap[ext] ?? 'image/jpeg';

    if (!Object.values(mimeMap).includes(contentType)) {
      throw new Error('Invalid image type. Please upload a JPG, PNG, or WEBP');
    }

    // Generate storage path: activityImages/{userId}/{activityId}_{timestamp}.{ext}
    const timestamp = Date.now();
    const fileName = activityId 
      ? `${activityId}_${timestamp}.${ext}`
      : `${timestamp}.${ext}`;
    const storagePath = `activityImages/${userId}/${fileName}`;
    const imageRef = ref(storage, storagePath);

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    await uploadString(imageRef, base64, 'base64', { contentType });
    
    return storagePath;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image');
  }
}

/**
 * Upload multiple activity images to Firebase Storage
 * @param userId - User ID for the storage path
 * @param imageUris - Array of local URIs to upload
 * @param activityId - Optional activity ID for organizing images
 * @returns Array of storage paths
 */
export async function uploadActivityImages(
  userId: string,
  imageUris: string[],
  activityId?: string
): Promise<string[]> {
  const uploadPromises = imageUris.map((uri) =>
    uploadActivityImage(userId, uri, activityId)
  );
  return Promise.all(uploadPromises);
}

/**
 * Get a fresh download URL from a storage path
 * @param storagePath - Firebase Storage path (e.g., "activityImages/userId/image.jpg")
 * @returns Fresh download URL
 */
export async function getFreshDownloadURL(storagePath: string): Promise<string> {
  try {
    const imageRef = ref(storage, storagePath);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error('Failed to get download URL for:', storagePath, error);
    throw error;
  }
}

/**
 * Get fresh download URLs for multiple storage paths
 * @param storagePaths - Array of Firebase Storage paths
 * @returns Array of fresh download URLs
 */
export async function getFreshDownloadURLs(
  storagePaths: string[]
): Promise<string[]> {
  const urlPromises = storagePaths.map((path) => getFreshDownloadURL(path));
  return Promise.all(urlPromises);
}

/**
 * Check if a string is a Firebase Storage path (not a download URL)
 * @param path - String to check
 * @returns True if it's a storage path
 */
export function isStoragePath(path: string): boolean {
  return !path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('file://');
}
