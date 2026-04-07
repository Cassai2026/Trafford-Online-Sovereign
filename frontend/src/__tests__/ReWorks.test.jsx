import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReWorks from '../components/ReWorks';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

function renderReWorks(user = null) {
  return render(
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn() }}>
      <ReWorks />
    </AuthContext.Provider>
  );
}

describe('ReWorks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the inventory heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderReWorks();
    expect(screen.getByRole('heading', { name: /Re-Works/i })).toBeInTheDocument();
  });

  it('renders the pollution log heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderReWorks();
    expect(screen.getByRole('heading', { name: /Transport Pollution Log/i })).toBeInTheDocument();
  });

  it('shows loading state for inventory', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderReWorks();
    expect(screen.getByText(/Loading inventory/i)).toBeInTheDocument();
  });

  it('shows empty state when no inventory items exist', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderReWorks();
    await waitFor(() => {
      expect(screen.getByText(/No inventory items yet/i)).toBeInTheDocument();
    });
  });

  it('renders an inventory item returned from the API', async () => {
    api.get
      .mockResolvedValueOnce({ data: [{ uuid: 'inv-1', item_name: 'Oak Door', source: 'biffa', quantity: 3, unit: 'units', build_stage: 'complete' }] })
      .mockResolvedValueOnce({ data: [] });
    renderReWorks();
    await waitFor(() => {
      expect(screen.getByText('Oak Door')).toBeInTheDocument();
    });
  });

  it('shows pollution table headers when data is present', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: 1, recorded_at: new Date().toISOString(), location: 'Stretford', no2_ug_m3: 42, pm25_ug_m3: 15, co2_ppm: 412, eco_progress_pct: 30 }] });
    renderReWorks();
    await waitFor(() => {
      expect(screen.getByText('Location')).toBeInTheDocument();
    });
  });

  it('prompts to sign in when not authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderReWorks(null);
    await waitFor(() => screen.getByText(/No inventory items yet/i));
    expect(screen.getByText(/Sign in to add inventory items/i)).toBeInTheDocument();
  });

  it('shows the inventory form when authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderReWorks({ name: 'Dave', email: 'dave@test.com' });
    await waitFor(() => screen.getByText(/No inventory items yet/i));
    expect(screen.getByPlaceholderText(/Item name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Inventory/i })).toBeInTheDocument();
  });

  it('calls api.post when form is submitted', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new-inv', item_name: 'Steel Sheet' } });
    renderReWorks({ name: 'Dave', email: 'dave@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));

    fireEvent.change(screen.getByPlaceholderText(/Item name/i), { target: { value: 'Steel Sheet' } });
    fireEvent.click(screen.getByRole('button', { name: /Add to Inventory/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reworks', expect.objectContaining({ item_name: 'Steel Sheet' }));
    });
  });

  it('shows success message after adding item', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new-inv', item_name: 'Timber Beam' } });
    renderReWorks({ name: 'Dave', email: 'dave@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));

    fireEvent.change(screen.getByPlaceholderText(/Item name/i), { target: { value: 'Timber Beam' } });
    fireEvent.click(screen.getByRole('button', { name: /Add to Inventory/i }));

    await waitFor(() => {
      expect(screen.getByText(/Item added to Re-Works inventory/i)).toBeInTheDocument();
    });
  });
});
