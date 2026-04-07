import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Deeds from '../components/Deeds';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

// Helper: render Deeds with optional auth user
function renderDeeds(user = null) {
  return render(
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn() }}>
      <Deeds />
    </AuthContext.Provider>
  );
}

describe('Deeds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderDeeds();
    expect(screen.getByText(/Loading deeds/i)).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderDeeds();
    expect(screen.getByRole('heading', { name: /Deed of Sovereign Transfer/i })).toBeInTheDocument();
  });

  it('shows empty state when no deeds exist', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDeeds();
    await waitFor(() => {
      expect(screen.getByText(/No deeds registered yet/i)).toBeInTheDocument();
    });
  });

  it('renders a deed returned from the API', async () => {
    api.get.mockResolvedValue({
      data: [{
        uuid: 'abc-123',
        asset_name: 'Stretford Mill',
        asset_type: 'building',
        transfer_status: 'pending',
        current_holder: 'Trafford Council',
        liability_value: 500000,
        liability_currency: 'GBP',
      }],
    });
    renderDeeds();
    await waitFor(() => {
      expect(screen.getByText('Stretford Mill')).toBeInTheDocument();
    });
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('prompts to sign in when not authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDeeds(null);
    await waitFor(() => screen.getByText(/No deeds registered yet/i));
    expect(screen.getByText(/Sign in to register a deed/i)).toBeInTheDocument();
  });

  it('shows the register form when authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDeeds({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByText(/No deeds registered yet/i));
    expect(screen.getByPlaceholderText(/Asset name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Deed/i })).toBeInTheDocument();
  });

  it('calls api.post when form is submitted', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new-uuid', asset_name: 'Test Plot' } });
    renderDeeds({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Asset name/i));

    fireEvent.change(screen.getByPlaceholderText(/Asset name/i), { target: { value: 'Test Plot' } });
    fireEvent.change(screen.getByPlaceholderText(/Current holder/i), { target: { value: 'Council' } });
    fireEvent.click(screen.getByRole('button', { name: /Register Deed/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/deeds', expect.objectContaining({
        asset_name: 'Test Plot',
        current_holder: 'Council',
      }));
    });
  });

  it('shows success message after registration', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new-uuid', asset_name: 'Test Plot' } });
    renderDeeds({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Asset name/i));

    fireEvent.change(screen.getByPlaceholderText(/Asset name/i), { target: { value: 'Test Plot' } });
    fireEvent.change(screen.getByPlaceholderText(/Current holder/i), { target: { value: 'Council' } });
    fireEvent.click(screen.getByRole('button', { name: /Register Deed/i }));

    await waitFor(() => {
      expect(screen.getByText(/Deed registered successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockRejectedValue(new Error('Forbidden'));
    renderDeeds({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Asset name/i));

    fireEvent.change(screen.getByPlaceholderText(/Asset name/i), { target: { value: 'Test Plot' } });
    fireEvent.change(screen.getByPlaceholderText(/Current holder/i), { target: { value: 'Council' } });
    fireEvent.click(screen.getByRole('button', { name: /Register Deed/i }));

    await waitFor(() => {
      expect(screen.getByText(/Forbidden/i)).toBeInTheDocument();
    });
  });
});
