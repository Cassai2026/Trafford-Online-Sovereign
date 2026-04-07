import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Safety from '../components/Safety';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

function renderSafety(user = null) {
  return render(
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn() }}>
      <Safety />
    </AuthContext.Provider>
  );
}

describe('Safety', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the section heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderSafety();
    expect(screen.getByRole('heading', { name: /Community Safety Reports/i })).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderSafety();
    expect(screen.getByText(/Loading reports/i)).toBeInTheDocument();
  });

  it('shows empty state when no reports exist', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderSafety();
    await waitFor(() => {
      expect(screen.getByText(/Community looks safe/i)).toBeInTheDocument();
    });
  });

  it('renders a report returned from the API', async () => {
    api.get.mockResolvedValue({
      data: [{
        uuid: 'rep-1',
        title: 'Broken pavement on King Street',
        description: 'Large crack — trip hazard',
        category: 'safety',
        severity: 'medium',
        status: 'open',
      }],
    });
    renderSafety();
    await waitFor(() => {
      expect(screen.getByText('Broken pavement on King Street')).toBeInTheDocument();
    });
    expect(screen.getByText('Large crack — trip hazard')).toBeInTheDocument();
  });

  it('shows category filter buttons', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderSafety();
    await waitFor(() => screen.getByText(/Community looks safe/i));
    expect(screen.getByRole('button', { name: /health/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /safety/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /environment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /social/i })).toBeInTheDocument();
  });

  it('prompts to sign in when not authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderSafety(null);
    await waitFor(() => screen.getByText(/Community looks safe/i));
    expect(screen.getByText(/Sign in to submit a safety report/i)).toBeInTheDocument();
  });

  it('shows the report form when authenticated', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderSafety({ name: 'Carol', email: 'carol@test.com' });
    await waitFor(() => screen.getByText(/Community looks safe/i));
    expect(screen.getByPlaceholderText(/Title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Report/i })).toBeInTheDocument();
  });

  it('calls api.post when form is submitted', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new-rep' } });
    renderSafety({ name: 'Carol', email: 'carol@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Title/i));

    fireEvent.change(screen.getByPlaceholderText(/Title/i), { target: { value: 'Flooding on Bridge St' } });
    fireEvent.change(screen.getByPlaceholderText(/Description/i), { target: { value: 'Water pooling' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/safety', expect.objectContaining({
        title: 'Flooding on Bridge St',
        description: 'Water pooling',
      }));
    });
  });

  it('shows confirmation message after successful submission', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { uuid: 'new-rep' } });
    renderSafety({ name: 'Carol', email: 'carol@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Title/i));

    fireEvent.change(screen.getByPlaceholderText(/Title/i), { target: { value: 'Gas leak' } });
    fireEvent.change(screen.getByPlaceholderText(/Description/i), { target: { value: 'Smell near park' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Safety report submitted/i)).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockRejectedValue(new Error('Server error'));
    renderSafety({ name: 'Carol', email: 'carol@test.com' });
    await waitFor(() => screen.getByPlaceholderText(/Title/i));

    fireEvent.change(screen.getByPlaceholderText(/Title/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText(/Description/i), { target: { value: 'Desc' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument();
    });
  });
});
