import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Materials from '../components/Materials';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

function renderMaterials(user = null) {
  return render(
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn() }}>
      <Materials />
    </AuthContext.Provider>
  );
}

describe('Materials', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the section heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderMaterials();
    expect(screen.getByRole('heading', { name: /Materials Exchange/i })).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderMaterials();
    expect(screen.getByText(/Loading materials/i)).toBeInTheDocument();
  });

  it('shows empty state when no materials exist', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderMaterials();
    await waitFor(() => {
      expect(screen.getByText(/No materials listed/i)).toBeInTheDocument();
    });
  });

  it('renders a material returned from the API', async () => {
    api.get.mockResolvedValue({
      data: [{
        uuid: 'mat-1', name: 'Oak Beam', category: 'timber',
        quantity: 5, unit: 'units', condition: 'good',
      }],
    });
    renderMaterials();
    await waitFor(() => {
      expect(screen.getByText('Oak Beam')).toBeInTheDocument();
    });
  });

  it('shows category filter buttons', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderMaterials();
    await waitFor(() => screen.getByText(/No materials/i));
    expect(screen.getByRole('button', { name: /timber/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /metal/i })).toBeInTheDocument();
  });

  it('prompts to sign in when not authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderMaterials(null);
    await waitFor(() => screen.getByText(/No materials listed/i));
    expect(screen.getByText(/Sign in to list a material/i)).toBeInTheDocument();
  });

  it('shows the listing form when authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderMaterials({ name: 'Bob', email: 'bob@test.com' });
    await waitFor(() => screen.getByText(/No materials listed/i));
    expect(screen.getByPlaceholderText(/Item name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /List Material/i })).toBeInTheDocument();
  });

  it('calls api.post when form is submitted', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new', name: 'Steel Rod', qr_code: null } });
    renderMaterials({ name: 'Bob', email: 'bob@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));

    fireEvent.change(screen.getByPlaceholderText(/Item name/i), { target: { value: 'Steel Rod' } });
    fireEvent.click(screen.getByRole('button', { name: /List Material/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/materials', expect.objectContaining({ name: 'Steel Rod' }));
    });
  });

  it('shows success message after listing', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new', name: 'Steel Rod', qr_code: null } });
    renderMaterials({ name: 'Bob', email: 'bob@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));

    fireEvent.change(screen.getByPlaceholderText(/Item name/i), { target: { value: 'Steel Rod' } });
    fireEvent.click(screen.getByRole('button', { name: /List Material/i }));

    await waitFor(() => {
      expect(screen.getByText(/"Steel Rod" listed successfully/i)).toBeInTheDocument();
    });
  });

  it('displays the QR code image when the API returns one', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({
      data: { uuid: 'new', name: 'Timber Plank', qr_code: 'data:image/png;base64,abc' },
    });
    renderMaterials({ name: 'Bob', email: 'bob@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Item name/i));

    fireEvent.change(screen.getByPlaceholderText(/Item name/i), { target: { value: 'Timber Plank' } });
    fireEvent.click(screen.getByRole('button', { name: /List Material/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/QR code for material/i)).toBeInTheDocument();
    });
  });
});
