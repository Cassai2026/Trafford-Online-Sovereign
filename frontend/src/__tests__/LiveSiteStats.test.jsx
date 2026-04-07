import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LiveSiteStats from '../components/LiveSiteStats';
import { api } from '../api';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
  },
}));

jest.mock('recharts', () => ({
  LineChart:         ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line:              () => null,
  XAxis:             () => null,
  YAxis:             () => null,
  CartesianGrid:     () => null,
  Tooltip:           () => null,
  Legend:            () => null,
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
}));

describe('LiveSiteStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<LiveSiteStats />);
    expect(screen.getByText(/Loading pollution data/i)).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<LiveSiteStats />);
    expect(screen.getByText(/Transport Pollution/i)).toBeInTheDocument();
  });

  it('renders the chart after data loads', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          recorded_at: '2026-01-01T00:00:00Z',
          no2_ug_m3: 45,
          pm25_ug_m3: 20,
          eco_progress_pct: 30,
        },
      ],
    });
    render(<LiveSiteStats />);
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('still renders chart (with placeholder data) on API error', async () => {
    api.get.mockRejectedValue(new Error('Service unavailable'));
    render(<LiveSiteStats />);
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('shows error message when the API call fails', async () => {
    api.get.mockRejectedValue(new Error('Service unavailable'));
    render(<LiveSiteStats />);
    await waitFor(() => {
      expect(screen.getByText(/Service unavailable/i)).toBeInTheDocument();
    });
  });

  it('renders chart even when API returns empty data', async () => {
    api.get.mockResolvedValue({ data: [] });
    render(<LiveSiteStats />);
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});
