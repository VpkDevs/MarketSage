import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProtectSection } from '../../../src/popup/components/protect/ProtectSection';
import { renderWithProviders } from '../../setup/utils/reactTestUtils';

describe('ProtectSection — explain in plain language', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.tabs.query as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation(async (message: any) => {
      if (message.type === 'ANALYZE_CURRENT_PAGE') {
        return {
          success: true,
          data: {
            product: { id: 'prod-1' },
            security: { riskScore: 42, warnings: ['Price is suspiciously low compared to history'], sellerTrust: 35 }
          }
        };
      }
      if (message.type === 'EXPLAIN_RISK') {
        return {
          success: true,
          data: {
            summary: 'MarketSage flagged one thing to look at before buying this item:',
            points: ['The price is far below what this kind of item normally sells for.'],
            source: 'fallback'
          }
        };
      }
      return { success: false, error: 'Unknown request type' };
    });
  });

  it('fetches and renders the explanation for the analyzed product', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProtectSection isActive={true} />);

    await waitFor(() => {
      expect(screen.getByText('Why this score?')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Explain in plain language' }));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'EXPLAIN_RISK',
      productId: 'prod-1'
    });

    await waitFor(() => {
      expect(
        screen.getByText(/MarketSage flagged one thing to look at/)
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/far below what this kind of item normally sells for/)).toBeInTheDocument();
    // The no-key built-in source is labeled, not passed off as AI
    expect(screen.getByText('Built-in explanation (no AI key set)')).toBeInTheDocument();
  });
});
