import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NodeProfile from '../components/NodeProfile';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

function renderProfile(user = null) {
  return render(
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn() }}>
      <NodeProfile />
    </AuthContext.Provider>
  );
}

describe('NodeProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the section heading', () => {
    renderProfile();
    expect(screen.getByRole('heading', { name: /My Sovereign Node/i })).toBeInTheDocument();
  });

  it('prompts to sign in when not authenticated', () => {
    renderProfile(null);
    expect(screen.getByText(/Sign in to view and manage your node profile/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching the node', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderProfile({ name: 'Alice', email: 'alice@test.com' });
    expect(screen.getByText(/Loading your node/i)).toBeInTheDocument();
  });

  it('shows create form when no node exists for the user', async () => {
    api.get.mockRejectedValue(new Error('404'));
    renderProfile({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create My Node/i })).toBeInTheDocument();
    });
  });

  it('shows update form when node exists', async () => {
    api.get.mockResolvedValue({
      data: {
        uuid: 'node-1', name: 'Alice', bio_roi: 'Community builder',
        skills: ['plumbing', 'carpentry'], constraints: ['heights'],
        reputation_score: '75.00',
      },
    });
    renderProfile({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Update Profile/i })).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
  });

  it('pre-fills skills from existing node', async () => {
    api.get.mockResolvedValue({
      data: {
        uuid: 'node-1', name: 'Alice', bio_roi: '',
        skills: ['plumbing', 'carpentry'], constraints: [],
        reputation_score: '75.00',
      },
    });
    renderProfile({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Update Profile/i }));
    expect(screen.getByDisplayValue(/plumbing, carpentry/i)).toBeInTheDocument();
  });

  it('calls api.patch when updating the profile', async () => {
    api.get.mockResolvedValue({
      data: { uuid: 'node-1', name: 'Alice', bio_roi: '', skills: [], constraints: [], reputation_score: '0.00' },
    });
    api.patch.mockResolvedValue({ data: { uuid: 'node-1', name: 'Alice Updated' } });
    renderProfile({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Update Profile/i }));

    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/nodes/node-1', expect.objectContaining({ name: 'Alice' }));
    });
  });

  it('calls api.post when creating a new node', async () => {
    api.get.mockRejectedValue(new Error('404'));
    api.post.mockResolvedValue({ data: { uuid: 'new-node', name: 'Bob' } });
    // Reload mock after creation
    api.get
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ data: { uuid: 'new-node', name: 'Bob', skills: [], constraints: [], reputation_score: '0.00', bio_roi: '' } });

    renderProfile({ name: 'Bob', email: 'bob@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Create My Node/i }));

    fireEvent.change(screen.getAllByPlaceholderText(/Display name/i)[0], { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /Create My Node/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/nodes', expect.objectContaining({ name: 'Bob' }));
    });
  });

  it('shows success message after update', async () => {
    api.get.mockResolvedValue({
      data: { uuid: 'node-1', name: 'Alice', bio_roi: '', skills: [], constraints: [], reputation_score: '0.00' },
    });
    api.patch.mockResolvedValue({ data: { uuid: 'node-1', name: 'Alice' } });
    renderProfile({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Update Profile/i }));

    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    await waitFor(() => {
      expect(screen.getByText(/Profile updated/i)).toBeInTheDocument();
    });
  });
});
