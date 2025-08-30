import { apiRequest } from './queryClient';

// API service to replace direct Firebase calls
export const apiService = {
  // Get all documents from a collection via API
  async getAllDocuments<T>(collectionName: string): Promise<T[]> {
    try {
      const response = await apiRequest('GET', `/api/${collectionName}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return [];
    }
  },

  // Get a single document by ID
  async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const response = await apiRequest('GET', `/api/${collectionName}/${id}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${collectionName}/${id}:`, error);
      return null;
    }
  },

  // Create a new document
  async createDocument<T>(collectionName: string, data: any): Promise<T> {
    const response = await apiRequest('POST', `/api/${collectionName}`, data);
    return await response.json();
  },

  // Update a document
  async updateDocument<T>(collectionName: string, id: string, data: any): Promise<T> {
    const response = await apiRequest('PUT', `/api/${collectionName}/${id}`, data);
    return await response.json();
  },

  // Delete a document
  async deleteDocument(collectionName: string, id: string): Promise<void> {
    await apiRequest('DELETE', `/api/${collectionName}/${id}`);
  },

  // Get settings
  async getSetting(key: string): Promise<any> {
    try {
      const response = await apiRequest('GET', `/api/settings/${key}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  },

  // Get sponsors
  async getSponsors(): Promise<any[]> {
    try {
      const response = await apiRequest('GET', '/api/sponsors');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      return [];
    }
  },

  // Get active sponsor
  async getActiveSponsor(): Promise<any> {
    try {
      const response = await apiRequest('GET', '/api/sponsors/active');
      return await response.json();
    } catch (error) {
      console.error('Error fetching active sponsor:', error);
      return null;
    }
  }
};
