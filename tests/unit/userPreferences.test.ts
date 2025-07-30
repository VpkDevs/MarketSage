import { ScamDetectionPreferences, DEFAULT_HEURISTICS } from '../../src/common/models/scamDetection/userPreferences';
import { Storage } from '../../src/common/utils/storage';

// Mock the Storage module
jest.mock('../../src/common/utils/storage');

describe('ScamDetectionPreferences', () => {
  let preferences: ScamDetectionPreferences;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get the singleton instance
    preferences = ScamDetectionPreferences.getInstance();
  });
  
  test('should return default preferences for a new user', async () => {
    // Mock Storage to return null (no existing preferences)
    (Storage.getUserScamPreferences as jest.Mock).mockResolvedValue(null);
    
    // Get preferences for a new user
    const userPrefs = await preferences.getUserPreferences('new-user');
    
    // Verify default preferences were returned
    expect(userPrefs.userId).toBe('new-user');
    expect(userPrefs.heuristics).toEqual(DEFAULT_HEURISTICS);
    expect(userPrefs.globalThreshold).toBe(70);
    
    // Verify preferences were saved
    expect(Storage.setUserScamPreferences).toHaveBeenCalledWith('new-user', userPrefs);
  });
  
  test('should return existing preferences for a returning user', async () => {
    // Create mock existing preferences
    const mockPrefs = {
      userId: 'existing-user',
      heuristics: [
        {
          id: 'price_anomaly',
          name: 'Price Anomaly Detection',
          description: 'Test description',
          category: 'Pricing',
          enabled: false, // Changed from default
          weight: 0.5, // Changed from default
          configOptions: {
            zScoreThreshold: 3.0, // Changed from default
            action: 'hide' // Changed from default
          }
        }
      ],
      globalThreshold: 50, // Changed from default
      lastUpdated: Date.now() - 1000 // 1 second ago
    };
    
    // Mock Storage to return existing preferences
    (Storage.getUserScamPreferences as jest.Mock).mockResolvedValue(mockPrefs);
    
    // Get preferences for existing user
    const userPrefs = await preferences.getUserPreferences('existing-user');
    
    // Verify existing preferences were returned
    expect(userPrefs).toEqual(mockPrefs);
    
    // Verify Storage was called with correct user ID
    expect(Storage.getUserScamPreferences).toHaveBeenCalledWith('existing-user');
    
    // Verify preferences were not saved again
    expect(Storage.setUserScamPreferences).not.toHaveBeenCalled();
  });
  
  test('should update a specific heuristic', async () => {
    // Mock existing preferences
    const mockPrefs = {
      userId: 'test-user',
      heuristics: [...DEFAULT_HEURISTICS],
      globalThreshold: 70,
      lastUpdated: Date.now() - 1000
    };
    
    // Mock Storage to return existing preferences
    (Storage.getUserScamPreferences as jest.Mock).mockResolvedValue(mockPrefs);
    
    // Update a heuristic
    const updatedPrefs = await preferences.updateHeuristic('test-user', 'price_anomaly', {
      enabled: false,
      weight: 0.3
    });
    
    // Find the updated heuristic
    const updatedHeuristic = updatedPrefs.heuristics.find(h => h.id === 'price_anomaly');
    
    // Verify heuristic was updated correctly
    expect(updatedHeuristic).toBeDefined();
    expect(updatedHeuristic?.enabled).toBe(false);
    expect(updatedHeuristic?.weight).toBe(0.3);
    
    // Other properties should remain unchanged
    expect(updatedHeuristic?.name).toBe('Price Anomaly Detection');
    expect(updatedHeuristic?.configOptions.zScoreThreshold).toBe(2.5);
    
    // Verify preferences were saved
    expect(Storage.setUserScamPreferences).toHaveBeenCalledWith('test-user', updatedPrefs);
  });
  
  test('should update global threshold', async () => {
    // Mock existing preferences
    const mockPrefs = {
      userId: 'test-user',
      heuristics: [...DEFAULT_HEURISTICS],
      globalThreshold: 70,
      lastUpdated: Date.now() - 1000
    };
    
    // Mock Storage to return existing preferences
    (Storage.getUserScamPreferences as jest.Mock).mockResolvedValue(mockPrefs);
    
    // Update global threshold
    const updatedPrefs = await preferences.updateGlobalThreshold('test-user', 85);
    
    // Verify threshold was updated
    expect(updatedPrefs.globalThreshold).toBe(85);
    
    // Verify preferences were saved
    expect(Storage.setUserScamPreferences).toHaveBeenCalledWith('test-user', updatedPrefs);
  });
  
  test('should reset preferences to defaults', async () => {
    // Update global threshold
    const resetPrefs = await preferences.resetToDefaults('test-user');
    
    // Verify preferences were reset to defaults
    expect(resetPrefs.userId).toBe('test-user');
    expect(resetPrefs.heuristics).toEqual(DEFAULT_HEURISTICS);
    expect(resetPrefs.globalThreshold).toBe(70);
    
    // Verify preferences were saved
    expect(Storage.setUserScamPreferences).toHaveBeenCalledWith('test-user', resetPrefs);
  });
});
