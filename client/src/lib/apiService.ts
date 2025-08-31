// API-based Firebase service to avoid client-side Firebase permission issues
import { BaseUser, Trainee, Staff, ResourcePerson, Sponsor, Batch } from './firebaseService';

// User functions
export const getUserByEmail = async (email: string): Promise<BaseUser | null> => {
  try {
    console.log('[API DEBUG] Getting user by email:', email);
    const response = await fetch(`/api/users/email/${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('[API DEBUG] User not found');
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    
    const user = await response.json();
    console.log('[API DEBUG] User found:', user);
    return user;
  } catch (error) {
    console.error('[API ERROR] Error fetching user by email:', error);
    return null;
  }
};

export const getUsers = async (): Promise<BaseUser[]> => {
  try {
    console.log('[API DEBUG] Getting all users');
    const response = await fetch('/api/users');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }
    
    const users = await response.json();
    console.log('[API DEBUG] Users fetched:', users.length);
    return users;
  } catch (error) {
    console.error('[API ERROR] Error fetching users:', error);
    return [];
  }
};

// Trainee functions
export const getTraineeByEmail = async (email: string): Promise<Trainee | null> => {
  try {
    console.log('[API DEBUG] Getting trainee by email:', email);
    const response = await fetch(`/api/trainees/email/${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('[API DEBUG] Trainee not found');
        return null;
      }
      throw new Error(`Failed to fetch trainee: ${response.statusText}`);
    }
    
    const trainee = await response.json();
    console.log('[API DEBUG] Trainee found:', trainee);
    return trainee;
  } catch (error) {
    console.error('[API ERROR] Error fetching trainee by email:', error);
    return null;
  }
};

export const getTrainees = async (): Promise<Trainee[]> => {
  try {
    console.log('[API DEBUG] Getting all trainees');
    const response = await fetch('/api/trainees');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch trainees: ${response.statusText}`);
    }
    
    const trainees = await response.json();
    console.log('[API DEBUG] Trainees fetched:', trainees.length);
    return trainees;
  } catch (error) {
    console.error('[API ERROR] Error fetching trainees:', error);
    return [];
  }
};

// Sponsor functions
export const getSponsors = async (): Promise<Sponsor[]> => {
  try {
    console.log('[API DEBUG] Getting all sponsors');
    const response = await fetch('/api/sponsors');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sponsors: ${response.statusText}`);
    }
    
    const sponsors = await response.json();
    console.log('[API DEBUG] Sponsors fetched:', sponsors.length);
    return sponsors;
  } catch (error) {
    console.error('[API ERROR] Error fetching sponsors:', error);
    return [];
  }
};

// Batch functions
export const getBatches = async (): Promise<Batch[]> => {
  try {
    console.log('[API DEBUG] Getting all batches');
    const response = await fetch('/api/batches');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch batches: ${response.statusText}`);
    }
    
    const batches = await response.json();
    console.log('[API DEBUG] Batches fetched:', batches.length);
    return batches;
  } catch (error) {
    console.error('[API ERROR] Error fetching batches:', error);
    return [];
  }
};
