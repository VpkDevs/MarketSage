import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoutSection } from '../../../src/popup/components/scout/ScoutSection';
import { renderWithProviders } from '../../setup/utils/reactTestUtils';
import { SCOUT_BASIS } from '../../../src/background/services/scout/productDiscovery';

const discoveryResponse = {
  success: true,
  data: {
    results: [
      {
        id: 'p1',
        title: 'Wireless Bluetooth Earbuds',
        platform: 'temu',
        price: 18,
        originalPrice: 30,
        currency: 'USD',
        discountPercent: 40,
        priceDropPercent: 40,
        rating: 4.4,
        reviewCount: 120,
        url: 'https://www.temu.com/earbuds',
        relevanceScore: 100,
        relevanceBasis: 'search match'
      }
    ],
    totalCandidates: 3,
    mode: 'search',
    basis: SCOUT_BASIS
  }
};

describe('ScoutSection', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await chrome.storage.local.clear();
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue(discoveryResponse);
  });

  it('renders real discovery results with honest labels', async () => {
    renderWithProviders(<ScoutSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText('Wireless Bluetooth Earbuds')).toBeInTheDocument();
    });

    // The data basis is disclosed, not dressed up as a live catalog
    expect(screen.getByText(SCOUT_BASIS)).toBeInTheDocument();
    expect(screen.getByText(/drawn from 3 viewed products/)).toBeInTheDocument();
    // Real numbers from the result: price, discount, recorded drop
    expect(screen.getByText('$18.00')).toBeInTheDocument();
    expect(screen.getByText('-40%')).toBeInTheDocument();
    expect(screen.getByText(/since MarketSage first recorded this price/)).toBeInTheDocument();
    expect(screen.getByText(/100% · search match/)).toBeInTheDocument();
  });

  it('searches the viewed history with the typed query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScoutSection isActive={true} />);
    await waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Search your viewed products'), 'earbuds');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const calls = (chrome.runtime.sendMessage as jest.Mock).mock.calls;
      const searchCall = calls.find(
        ([msg]) => msg.type === 'DISCOVER_PRODUCTS' && msg.options.query === 'earbuds'
      );
      expect(searchCall).toBeDefined();
    });
  });

  it('shows the honest empty state when nothing has been viewed', async () => {
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      data: { results: [], totalCandidates: 0, mode: 'value', basis: SCOUT_BASIS }
    });

    renderWithProviders(<ScoutSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Scout has nothing to work with yet/)).toBeInTheDocument();
    });
  });

  it('watchlist persists the price from when the item was added', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScoutSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText('Wireless Bluetooth Earbuds')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '👁 Watch' }));

    const stored = await chrome.storage.local.get('scout_watchlist');
    expect(stored.scout_watchlist).toHaveLength(1);
    expect(stored.scout_watchlist[0].priceWhenAdded).toBe(18);

    await user.click(screen.getByRole('button', { name: /Watchlist \(1\)/ }));
    expect(screen.getByText(/\$18\.00 when added/)).toBeInTheDocument();
  });
});
