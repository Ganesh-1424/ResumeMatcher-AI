import api from './api';

/**
 * Service: User Profile API Client
 * 
 * Handles authenticated profile retrieval, updates, and password changes.
 */

/**
 * Fetch authenticated user profile, statistics, and recent activities.
 */
export const getUserProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

/**
 * Update user profile details (name, avatarUrl).
 * 
 * @param {Object} profileData - { name: string, avatarUrl?: string }
 */
export const updateUserProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

/**
 * Change account password for authenticated user.
 * 
 * @param {Object} passwordData - { currentPassword?: string, newPassword: string }
 */
export const changeUserPassword = async (passwordData) => {
  const response = await api.put('/auth/profile/password', passwordData);
  return response.data;
};
