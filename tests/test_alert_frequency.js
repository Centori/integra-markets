import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act } from '@testing-library/react-hooks';
import useAlertPreferences, { ALERT_FREQUENCIES } from '../app/hooks/useAlertPreferences';
import { api } from '../app/services/apiClient';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock API client
jest.mock('../app/services/apiClient', () => ({
  api: {
    getNewsAnalysis: jest.fn(),
  },
}));

describe('Alert Frequency Integration', () => {
  beforeEach(() => {
    // Clear mocks before each test
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    api.getNewsAnalysis.mockClear();
  });

  it('should load default preferences', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    const { result, waitForNextUpdate } = renderHook(() => useAlertPreferences());
    
    await waitForNextUpdate();
    
    expect(result.current.preferences.frequency).toBe(ALERT_FREQUENCIES.REALTIME);
    expect(result.current.preferences.minImpact).toBe('LOW');
  });

  it('should save and load preferences', async () => {
    const testPrefs = {
      frequency: ALERT_FREQUENCIES.DAILY,
      minImpact: 'MEDIUM',
      lastAlertTime: new Date().toISOString(),
      commodityFilters: ['GOLD', 'OIL'],
    };
    
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(testPrefs));
    const { result, waitForNextUpdate } = renderHook(() => useAlertPreferences());
    
    await waitForNextUpdate();
    
    expect(result.current.preferences).toEqual(testPrefs);
  });

  it('should filter alerts based on frequency', async () => {
    const recentDate = new Date();
    const oldDate = new Date(recentDate - 48 * 60 * 60 * 1000); // 48 hours ago
    
    const testArticles = [
      {
        title: 'Breaking News - Oil Surge',
        market_impact: 'HIGH',
        published: recentDate.toISOString(),
      },
      {
        title: 'Weekly Market Report',
        market_impact: 'MEDIUM',
        published: oldDate.toISOString(),
      },
    ];
    
    // Test realtime frequency
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      frequency: ALERT_FREQUENCIES.REALTIME,
      minImpact: 'LOW',
    }));
    
    const { result, waitForNextUpdate } = renderHook(() => useAlertPreferences());
    await waitForNextUpdate();
    
    expect(result.current.shouldShowAlert(testArticles[0])).toBe(true);
    expect(result.current.shouldShowAlert(testArticles[1])).toBe(false);
    
    // Update to daily frequency
    await act(async () => {
      await result.current.setAlertFrequency(ALERT_FREQUENCIES.DAILY);
    });
    
    expect(result.current.shouldShowAlert(testArticles[0])).toBe(true);
    expect(result.current.shouldShowAlert(testArticles[1])).toBe(false);
  });

  it('should respect minimum impact level', async () => {
    const testArticles = [
      {
        title: 'High Impact News',
        market_impact: 'HIGH',
        published: new Date().toISOString(),
      },
      {
        title: 'Medium Impact News',
        market_impact: 'MEDIUM',
        published: new Date().toISOString(),
      },
      {
        title: 'Low Impact News',
        market_impact: 'LOW',
        published: new Date().toISOString(),
      },
    ];
    
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      frequency: ALERT_FREQUENCIES.REALTIME,
      minImpact: 'MEDIUM',
    }));
    
    const { result, waitForNextUpdate } = renderHook(() => useAlertPreferences());
    await waitForNextUpdate();
    
    expect(result.current.shouldShowAlert(testArticles[0])).toBe(true);
    expect(result.current.shouldShowAlert(testArticles[1])).toBe(true);
    expect(result.current.shouldShowAlert(testArticles[2])).toBe(false);
  });

  it('should filter by commodity', async () => {
    const testArticles = [
      {
        title: 'Gold Price Update',
        market_impact: 'HIGH',
        published: new Date().toISOString(),
        commodities: ['GOLD'],
      },
      {
        title: 'Oil Market News',
        market_impact: 'HIGH',
        published: new Date().toISOString(),
        commodities: ['OIL'],
      },
    ];
    
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      frequency: ALERT_FREQUENCIES.REALTIME,
      minImpact: 'LOW',
      commodityFilters: ['GOLD'],
    }));
    
    const { result, waitForNextUpdate } = renderHook(() => useAlertPreferences());
    await waitForNextUpdate();
    
    expect(result.current.shouldShowAlert(testArticles[0])).toBe(true);
    expect(result.current.shouldShowAlert(testArticles[1])).toBe(false);
  });

  it('should integrate with news API', async () => {
    const mockApiResponse = {
      news: [
        {
          title: 'Test Article 1',
          market_impact: 'HIGH',
          published: new Date().toISOString(),
        },
        {
          title: 'Test Article 2',
          market_impact: 'LOW',
          published: new Date().toISOString(),
        },
      ],
    };
    
    api.getNewsAnalysis.mockResolvedValue(mockApiResponse);
    
    const testPrefs = {
      frequency: ALERT_FREQUENCIES.REALTIME,
      minImpact: 'HIGH',
    };
    
    // Simulate API call with preferences
    const response = await api.getNewsAnalysis(testPrefs);
    
    expect(response.news.length).toBe(2);
    expect(api.getNewsAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: ALERT_FREQUENCIES.REALTIME,
        minImpact: 'HIGH',
      })
    );
  });
});
