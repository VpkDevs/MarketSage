import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PriceAnomalySettings from '../../src/popup/components/settings/PriceAnomalySettings';
import { ScamDetectionPreferences } from '../../src/common/models/scamDetection/userPreferences';

// Mock the ScamDetectionPreferences
jest.mock('../../src/common/models/scamDetection/userPreferences', () => {
  return {
    ScamDetectionPreferences: {
      getInstance: jest.fn().mockReturnValue({
        updateHeuristic: jest.fn().mockResolvedValue({})
      })
    }
  };
});

describe('PriceAnomalySettings Component', () => {
  // Sample heuristic data
  const mockHeuristic = {
    id: 'price_anomaly',
    name: 'Price Anomaly Detection',
    description: 'Identifies products with prices significantly lower or higher than market average',
    category: 'Pricing',
    enabled: true,
    weight: 0.8,
    configOptions: {
      zScoreThreshold: 2.5,
      action: 'notify'
    }
  };
  
  const mockUserId = 'test-user';
  const mockOnUpdate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders correctly with enabled heuristic', () => {
    render(
      <PriceAnomalySettings 
        userId={mockUserId} 
        heuristic={mockHeuristic} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Check that the component renders with the correct title
    expect(screen.getByText('Price Anomaly Detection')).toBeInTheDocument();
    
    // Check that the toggle is enabled
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
    
    // Check that the settings controls are visible
    expect(screen.getByText('Importance (Weight):')).toBeInTheDocument();
    expect(screen.getByText('Sensitivity (Standard Deviations):')).toBeInTheDocument();
    expect(screen.getByText('When anomaly detected:')).toBeInTheDocument();
  });
  
  test('toggles explanation when Learn More is clicked', () => {
    render(
      <PriceAnomalySettings 
        userId={mockUserId} 
        heuristic={mockHeuristic} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Explanation should not be visible initially
    expect(screen.queryByText('Understanding Standard Deviations in Price Analysis')).not.toBeInTheDocument();
    
    // Click the Learn More button
    fireEvent.click(screen.getByText('Learn More'));
    
    // Explanation should now be visible
    expect(screen.getByText('Understanding Standard Deviations in Price Analysis')).toBeInTheDocument();
    
    // Click the Hide Info button
    fireEvent.click(screen.getByText('Hide Info'));
    
    // Explanation should be hidden again
    expect(screen.queryByText('Understanding Standard Deviations in Price Analysis')).not.toBeInTheDocument();
  });
  
  test('toggles heuristic on/off', async () => {
    render(
      <PriceAnomalySettings 
        userId={mockUserId} 
        heuristic={mockHeuristic} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Toggle the heuristic off
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    
    // Check that updateHeuristic was called with correct parameters
    await waitFor(() => {
      expect(ScamDetectionPreferences.getInstance().updateHeuristic).toHaveBeenCalledWith(
        mockUserId,
        'price_anomaly',
        { enabled: false }
      );
    });
    
    // Check that onUpdate was called
    expect(mockOnUpdate).toHaveBeenCalled();
  });
  
  test('changes weight when slider is adjusted', async () => {
    render(
      <PriceAnomalySettings 
        userId={mockUserId} 
        heuristic={mockHeuristic} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Find the weight slider
    const weightSlider = screen.getByLabelText('Importance (Weight):').querySelector('input[type="range"]');
    expect(weightSlider).toBeInTheDocument();
    
    // Change the slider value
    fireEvent.change(weightSlider!, { target: { value: '0.5' } });
    
    // Check that updateHeuristic was called with correct parameters
    await waitFor(() => {
      expect(ScamDetectionPreferences.getInstance().updateHeuristic).toHaveBeenCalledWith(
        mockUserId,
        'price_anomaly',
        { weight: 0.5 }
      );
    });
    
    // Check that onUpdate was called
    expect(mockOnUpdate).toHaveBeenCalled();
  });
  
  test('changes threshold when slider is adjusted', async () => {
    render(
      <PriceAnomalySettings 
        userId={mockUserId} 
        heuristic={mockHeuristic} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Find the threshold slider
    const thresholdSlider = screen.getByLabelText('Sensitivity (Standard Deviations):').querySelector('input[type="range"]');
    expect(thresholdSlider).toBeInTheDocument();
    
    // Change the slider value
    fireEvent.change(thresholdSlider!, { target: { value: '3.0' } });
    
    // Check that updateHeuristic was called with correct parameters
    await waitFor(() => {
      expect(ScamDetectionPreferences.getInstance().updateHeuristic).toHaveBeenCalledWith(
        mockUserId,
        'price_anomaly',
        { configOptions: { ...mockHeuristic.configOptions, zScoreThreshold: 3.0 } }
      );
    });
    
    // Check that onUpdate was called
    expect(mockOnUpdate).toHaveBeenCalled();
  });
  
  test('changes action when dropdown is changed', async () => {
    render(
      <PriceAnomalySettings 
        userId={mockUserId} 
        heuristic={mockHeuristic} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Find the action dropdown
    const actionSelect = screen.getByRole('combobox');
    expect(actionSelect).toBeInTheDocument();
    
    // Change the selected action
    fireEvent.change(actionSelect, { target: { value: 'warn' } });
    
    // Check that updateHeuristic was called with correct parameters
    await waitFor(() => {
      expect(ScamDetectionPreferences.getInstance().updateHeuristic).toHaveBeenCalledWith(
        mockUserId,
        'price_anomaly',
        { configOptions: { ...mockHeuristic.configOptions, action: 'warn' } }
      );
    });
    
    // Check that onUpdate was called
    expect(mockOnUpdate).toHaveBeenCalled();
    
    // Check that the preview changes to show the warning banner
    expect(screen.getByText('This product\'s price is unusually low compared to similar items.')).toBeInTheDocument();
  });
});
