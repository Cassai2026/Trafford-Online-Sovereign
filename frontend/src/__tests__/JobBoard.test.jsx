import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import JobBoard from '../components/JobBoard';
import { api } from '../api';

jest.mock('../api', () => ({
  api: {
    get:  jest.fn(),
    post: jest.fn(),
  },
}));

describe('JobBoard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<JobBoard />);
    expect(screen.getByText(/Loading swaps/i)).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<JobBoard />);
    expect(screen.getByRole('heading', { name: /Job Board/i })).toBeInTheDocument();
  });

  it('shows empty-state message when no swaps exist', async () => {
    api.get.mockResolvedValue({ data: [] });
    render(<JobBoard />);
    await waitFor(() => {
      expect(screen.getByText(/No active swap requests/i)).toBeInTheDocument();
    });
  });

  it('renders swap items returned from the API', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          uuid: 'abc-123',
          skill_needed: 'Plumbing',
          status: 'open',
          location: 'Stretford/Trafford',
          description: 'Fix a leaky tap',
        },
      ],
    });
    render(<JobBoard />);
    await waitFor(() => {
      expect(screen.getByText('Plumbing')).toBeInTheDocument();
    });
    expect(screen.getByText('Fix a leaky tap')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    api.get.mockRejectedValue(new Error('Failed to fetch'));
    render(<JobBoard />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('does not call api.post when skill_needed is empty', async () => {
    api.get.mockResolvedValue({ data: [] });
    render(<JobBoard />);
    await waitFor(() => screen.getByText(/No active swap requests/i));
    fireEvent.click(screen.getByRole('button', { name: /Post Swap Request/i }));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits the swap form when skill_needed is filled', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 1 } });
    render(<JobBoard />);
    await waitFor(() => screen.getByText(/No active swap requests/i));
    fireEvent.change(
      screen.getByPlaceholderText(/Skill needed/i),
      { target: { value: 'Carpentry' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Post Swap Request/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/swaps',
        expect.objectContaining({ skill_needed: 'Carpentry' }),
      );
    });
  });

  it('clears the form input after successful submission', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 1 } });
    render(<JobBoard />);
    await waitFor(() => screen.getByText(/No active swap requests/i));
    const input = screen.getByPlaceholderText(/Skill needed/i);
    fireEvent.change(input, { target: { value: 'Welding' } });
    fireEvent.click(screen.getByRole('button', { name: /Post Swap Request/i }));
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});
