import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GenesisEngine from '../components/GenesisEngine';
import { api } from '../api';

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('GenesisEngine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all four Tetrad nodes', () => {
    render(<GenesisEngine />);
    expect(screen.getByText('ODIN')).toBeInTheDocument();
    expect(screen.getByText('HEKETE')).toBeInTheDocument();
    expect(screen.getByText('KONG')).toBeInTheDocument();
    expect(screen.getByText('ENKI')).toBeInTheDocument();
  });

  it('shows ONLINE badge for ODIN, HEKETE, and KONG', () => {
    render(<GenesisEngine />);
    const onlineBadges = screen.getAllByText('ONLINE');
    expect(onlineBadges.length).toBe(3);
  });

  it('shows STANDBY badge for ENKI', () => {
    render(<GenesisEngine />);
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
  });

  it('renders the EXECUTE button', () => {
    render(<GenesisEngine />);
    expect(screen.getByRole('button', { name: /EXECUTE/i })).toBeInTheDocument();
  });

  it('EXECUTE button is disabled when intent input is empty', () => {
    render(<GenesisEngine />);
    expect(screen.getByRole('button', { name: /EXECUTE/i })).toBeDisabled();
  });

  it('EXECUTE button becomes enabled when intent is typed', () => {
    render(<GenesisEngine />);
    fireEvent.change(
      screen.getByPlaceholderText(/Speak your intent/i),
      { target: { value: 'route energy to odin' } },
    );
    expect(screen.getByRole('button', { name: /EXECUTE/i })).not.toBeDisabled();
  });

  it('calls api.post with the typed intent on submit', async () => {
    api.post.mockResolvedValue({
      data: { routed_to: 'odin', label: 'ODIN', output: 'VAJRA → ODIN: energy logged' },
    });
    render(<GenesisEngine />);
    fireEvent.change(
      screen.getByPlaceholderText(/Speak your intent/i),
      { target: { value: 'record energy credit' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vajra/compile',
        { intent: 'record energy credit' },
      );
    });
  });

  it('displays the Vajra output after successful compile', async () => {
    api.post.mockResolvedValue({
      data: { routed_to: 'odin', label: 'ODIN', output: 'VAJRA → ODIN: energy logged' },
    });
    render(<GenesisEngine />);
    fireEvent.change(
      screen.getByPlaceholderText(/Speak your intent/i),
      { target: { value: 'record energy credit' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE/i }));
    await waitFor(() => {
      expect(screen.getByText(/VAJRA → ODIN/i)).toBeInTheDocument();
    });
  });

  it('shows error message when compile fails', async () => {
    api.post.mockRejectedValue(new Error('Vajra offline'));
    render(<GenesisEngine />);
    fireEvent.change(
      screen.getByPlaceholderText(/Speak your intent/i),
      { target: { value: 'fire compute task' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE/i }));
    await waitFor(() => {
      expect(screen.getByText(/ERROR: Vajra offline/i)).toBeInTheDocument();
    });
  });

  it('shows command log after successful submission', async () => {
    api.post.mockResolvedValue({
      data: { routed_to: 'kong', label: 'KONG', output: 'VAJRA → KONG: compute dispatched' },
    });
    render(<GenesisEngine />);
    fireEvent.change(
      screen.getByPlaceholderText(/Speak your intent/i),
      { target: { value: 'dispatch compute task' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE/i }));
    await waitFor(() => {
      expect(screen.getByText('Command Log')).toBeInTheDocument();
    });
  });

  it('clears the intent input after submission', async () => {
    api.post.mockResolvedValue({
      data: { routed_to: 'odin', label: 'ODIN', output: 'VAJRA → ODIN: done' },
    });
    render(<GenesisEngine />);
    const input = screen.getByPlaceholderText(/Speak your intent/i);
    fireEvent.change(input, { target: { value: 'audit carbon' } });
    fireEvent.click(screen.getByRole('button', { name: /EXECUTE/i }));
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('shows awaiting message before any command is submitted', () => {
    render(<GenesisEngine />);
    expect(screen.getByText(/Awaiting sovereign command/i)).toBeInTheDocument();
  });
});
