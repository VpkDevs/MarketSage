import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProtectSection } from '../../../src/popup/components/protect/ProtectSection';
import { renderWithProviders } from '../../setup/utils/reactTestUtils';
import { createMockProduct } from '../../setup/utils/testUtils';
import { Platform } from '../../../src/common/types';

describe('ProtectSection', () => {
  const mockProduct = createMockProduct({
    id: 'test-product',
    title: 'Test Product',
    price: { current: 29.99, original: 39.99, currency: 'USD' },
    seller: { id: 'test-seller', name: 'Test Seller', rating: 4.5, totalSales: 1000 },
    platform: Platform.TEMU
  });

  // Mock chrome API responses
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock chrome.tabs.query
    (chrome.tabs.query as jest.Mock).mockResolvedValue([
      { id: 1, url: 'https://example.com' }
    ]);

    // Mock chrome.runtime.sendMessage
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        security: {
          riskScore: 85,
          warnings: [],
          sellerTrust: 90
        }
      }
    });
  });

  it('renders security metrics when active', async () => {
    // Act
    renderWithProviders(<ProtectSection isActive={true} />);

    // Assert
    expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Analyzing security metrics...')).not.toBeInTheDocument();
    });

    // Check metrics are displayed
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('shows loading state initially when active', () => {
    // Act
    renderWithProviders(<ProtectSection isActive={true} />);

    // Assert
    expect(screen.getByText('Analyzing security metrics...')).toBeInTheDocument();
  });

  it('displays error state when analysis fails', async () => {
    // Arrange
    const errorMessage = 'Failed to analyze page';
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
      success: false,
      error: errorMessage
    });

    // Act
    renderWithProviders(<ProtectSection isActive={true} />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(screen.getByText('Retry Analysis')).toBeInTheDocument();
  });

  it('allows retrying analysis after error', async () => {
    // Arrange
    (chrome.runtime.sendMessage as jest.Mock)
      .mockResolvedValueOnce({ success: false, error: 'Error' })
      .mockResolvedValueOnce({
        success: true,
        data: {
          security: {
            riskScore: 85,
            warnings: [],
            sellerTrust: 90
          }
        }
      });

    // Act
    renderWithProviders(<ProtectSection isActive={true} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Retry Analysis')).toBeInTheDocument();
    });

    // Click retry button
    await userEvent.click(screen.getByText('Retry Analysis'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });

  it('displays security warnings when present', async () => {
    // Arrange
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        security: {
          riskScore: 45,
          warnings: [
            'Price is suspiciously low',
            'Seller has limited history'
          ],
          sellerTrust: 30
        }
      }
    });

    // Act
    renderWithProviders(<ProtectSection isActive={true} />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Price is suspiciously low')).toBeInTheDocument();
      expect(screen.getByText('Seller has limited history')).toBeInTheDocument();
    });
  });

  it('renders nothing when not active', () => {
    // Act
    const { container } = renderWithProviders(<ProtectSection isActive={false} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });
});
