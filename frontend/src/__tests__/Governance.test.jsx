import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Governance from '../components/Governance';
import { api } from '../api';
import { AuthContext } from '../AuthContext';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

const MOCK_PILLARS = Array.from({ length: 15 }, (_, i) => ({
  id:            i + 1,
  pillar_number: i + 1,
  pillar_name:   `Pillar ${i + 1}`,
  is_active:     true,
}));

const MOCK_AUDIT = {
  week:              '2026-04-07',
  pillars_audited:   0,
  pillars_balanced:  0,
  gate_passed:       false,
  all_balanced:      false,
  entries:           [],
};

function renderGovernance(user = null) {
  return render(
    <AuthContext.Provider value={{ user, login: jest.fn(), logout: jest.fn() }}>
      <Governance />
    </AuthContext.Provider>
  );
}

describe('Governance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderGovernance();
    expect(screen.getByText(/Loading governance data/i)).toBeInTheDocument();
  });

  it('renders the section heading', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: MOCK_AUDIT });
    renderGovernance();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Governance/i })).toBeInTheDocument();
    });
  });

  it('renders all 15 pillar names', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: MOCK_AUDIT });
    renderGovernance();
    await waitFor(() => screen.getByText('Pillar 1'));
    expect(screen.getByText('Pillar 15')).toBeInTheDocument();
  });

  it('shows the gate status banner', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: { ...MOCK_AUDIT, gate_passed: false } });
    renderGovernance();
    await waitFor(() => {
      expect(screen.getByText(/Gate incomplete/i)).toBeInTheDocument();
    });
  });

  it('shows PASSED banner when all pillars are balanced', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: { ...MOCK_AUDIT, gate_passed: true, pillars_balanced: 15, pillars_audited: 15 } });
    renderGovernance();
    await waitFor(() => {
      expect(screen.getByText(/Gate PASSED/i)).toBeInTheDocument();
    });
  });

  it('prompts to sign in when not authenticated (no sliders)', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: MOCK_AUDIT });
    renderGovernance(null);
    await waitFor(() => screen.getByText('Pillar 1'));
    expect(screen.getByText(/Sign in to submit a weekly audit/i)).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('shows sliders and submit button when authenticated', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: MOCK_AUDIT });
    renderGovernance({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Submit Weekly Audit/i }));
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(15);
  });

  it('calls api.post with scores array on submit', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: MOCK_AUDIT });
    api.post.mockResolvedValue({
      data: { gate_passed: false, balanced: 0, entries: [] },
    });
    renderGovernance({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Submit Weekly Audit/i }));

    fireEvent.click(screen.getByRole('button', { name: /Submit Weekly Audit/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/governance/audit',
        expect.objectContaining({ scores: expect.arrayContaining([expect.objectContaining({ pillar_id: 1 })]) })
      );
    });
  });

  it('shows gate PASSED success message when all pillars balanced', async () => {
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: MOCK_AUDIT });
    api.post.mockResolvedValue({
      data: { gate_passed: true, balanced: 15, entries: [] },
    });
    // Re-load after submission
    api.get
      .mockResolvedValueOnce({ data: MOCK_PILLARS })
      .mockResolvedValueOnce({ data: { ...MOCK_AUDIT, gate_passed: true } });

    renderGovernance({ name: 'Alice', email: 'alice@test.com' });
    await waitFor(() => screen.getByRole('button', { name: /Submit Weekly Audit/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit Weekly Audit/i }));

    await waitFor(() => {
      expect(screen.getByText(/All 14\+1 Pillars Aligned/i)).toBeInTheDocument();
    });
  });
});
