import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { InsightSection } from '../../../src/popup/components/insight/InsightSection';
import { renderWithProviders } from '../../setup/utils/reactTestUtils';

const priceDataResponse = {
  success: true,
  data: {
    pricing: {
      currentPrice: 80,
      marketAverage: 100,
      marketSampleSize: 1,
      priceHistory: [{ price: 80, timestamp: '2026-11-08T00:00:00.000Z' }],
      valueScore: 0.85,
      trend: 'stable',
      recommendations: ['Good value - price is below market average']
    },
    insights: [
      {
        id: 'price_drop',
        type: 'price_drop',
        title: 'Price drop since your last visit',
        description: 'This listing was $100.00 the last time MarketSage recorded it and is $80.00 now — a drop of 20.0%.',
        impact: 'high',
        timestamp: '2026-11-08T00:00:00.000Z'
      }
    ],
    historyCount: 1
  }
};

describe('InsightSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue(priceDataResponse);
  });

  it('requests ANALYZE_PRICE_DATA and renders the analytics', async () => {
    renderWithProviders(<InsightSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getAllByText('$80.00').length).toBeGreaterThan(0);
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'ANALYZE_PRICE_DATA'
    });
  });

  it('shows the value score on a /100 scale, not the raw 0..1 value', async () => {
    renderWithProviders(<InsightSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });
    expect(screen.getByText('Value Rating / 100')).toBeInTheDocument();
    expect(screen.queryByText('0.85')).not.toBeInTheDocument();
  });

  it('labels a one-product "market average" honestly', async () => {
    renderWithProviders(<InsightSection isActive={true} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Not enough similar products viewed yet/)
      ).toBeInTheDocument();
    });
  });

  it('renders insights computed from the recorded history', async () => {
    renderWithProviders(<InsightSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText('Price drop since your last visit')).toBeInTheDocument();
    });
    expect(screen.getByText(/a drop of 20\.0%/)).toBeInTheDocument();
  });

  it('says plainly when only one price has been recorded', async () => {
    renderWithProviders(<InsightSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Only one price recorded for this product so far/)).toBeInTheDocument();
    });
  });
});
