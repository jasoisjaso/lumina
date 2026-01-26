import axios from 'axios';

/**
 * Setup API
 * First-time deployment configuration
 * Uses separate axios instance (no auth interceptor)
 */

// Use relative URL in production so nginx can proxy it
// Use localhost:3001 in development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:3001/api/v1');

const setupClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SetupStatus {
  setupNeeded: boolean;
  message: string;
}

export interface SetupData {
  // Family details
  familyName: string;
  timezone?: string;

  // Admin account
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;

  // Optional integrations
  weatherApiKey?: string;
  weatherLocation?: string;
  weatherUnits?: 'metric' | 'imperial';

  woocommerceStoreUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
}

export interface SetupResponse {
  message: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    family_id: number;
    role: 'admin' | 'member';
    color: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  family: {
    id: number;
    name: string;
  };
}

export const setupAPI = {
  /**
   * Check if setup is needed
   */
  async getStatus(): Promise<SetupStatus> {
    const response = await setupClient.get<SetupStatus>('/setup/status');
    return response.data;
  },

  /**
   * Initialize system with setup data
   */
  async initialize(data: SetupData): Promise<SetupResponse> {
    const response = await setupClient.post<SetupResponse>('/setup/initialize', data);
    return response.data;
  },

  /**
   * Validate if email is available
   */
  async validateEmail(email: string): Promise<{ available: boolean; message: string }> {
    const response = await setupClient.post<{ available: boolean; message: string }>(
      '/setup/validate-email',
      { email }
    );
    return response.data;
  },
};

export default setupAPI;
