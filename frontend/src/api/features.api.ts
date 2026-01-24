import apiClient from './axios.config';

export interface FeatureStatus {
  enabled: boolean;
  working: boolean;
  configured: boolean;
  canShow: boolean;
  message?: string;
  details?: any;
}

export interface FeaturesStatusResponse {
  calendar: FeatureStatus;
  photos: FeatureStatus;
  workflow: FeatureStatus;
  weather: FeatureStatus;
  timestamp: string;
}

/**
 * Features API
 * Handles feature status checks
 */
export const featuresAPI = {
  /**
   * Get status of all features
   */
  async getStatus(): Promise<FeaturesStatusResponse> {
    const response = await apiClient.get('/features/status');
    return response.data;
  },
};

export default featuresAPI;
