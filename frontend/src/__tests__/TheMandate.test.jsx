import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TheMandate from '../components/TheMandate';
import { api } from '../api';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('TheMandate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state before API resolves', () => {
    api.get.mockReturnValue(new Promise(() => {})); // never resolves
    render(<TheMandate />);
    expect(screen.getByText(/Connecting to the sovereign network/i)).toBeInTheDocument();
  });

  it('renders the 15 Billion Hearts heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<TheMandate />);
    expect(screen.getByRole('heading', { name: /15 Billion Hearts/i })).toBeInTheDocument();
  });

  it('shows heart count equal to number of nodes returned', async () => {
    api.get
      .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] }) // /nodes
      .mockResolvedValueOnce({ data: null });                               // /governance/reflect
    const { container } = render(<TheMandate />);
    await waitFor(() => {
      const countEl = container.querySelector('.mandate-count');
      expect(countEl).not.toBeNull();
      expect(countEl.textContent).toBe('3');
    });
  });

  it('shows aligned gate banner when gate_passed is true', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { gate_passed: true } });
    render(<TheMandate />);
    await waitFor(() => {
      expect(screen.getByText(/All 14\+1 Pillars Aligned/i)).toBeInTheDocument();
    });
  });

  it('shows warning banner with message when gate_passed is false', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { gate_passed: false, message: 'Pillars out of balance' } });
    render(<TheMandate />);
    await waitFor(() => {
      expect(screen.getByText(/Pillars out of balance/i)).toBeInTheDocument();
    });
  });

  it('hides loading text after API resolves', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: null });
    render(<TheMandate />);
    await waitFor(() => {
      expect(screen.queryByText(/Connecting to the sovereign network/i)).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully without crashing', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    render(<TheMandate />);
    await waitFor(() => {
      expect(screen.queryByText(/Connecting to the sovereign network/i)).not.toBeInTheDocument();
    });
    // Component still renders the heading
    expect(screen.getByRole('heading', { name: /15 Billion Hearts/i })).toBeInTheDocument();
  });
});
