import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock child components to test routing in isolation, without API calls
jest.mock('../components/TheMandate',    () => () => <div data-testid="view-mandate">TheMandate</div>);
jest.mock('../components/LiveSiteStats', () => () => <div data-testid="view-stats">LiveSiteStats</div>);
jest.mock('../components/JobBoard',      () => () => <div data-testid="view-jobs">JobBoard</div>);
jest.mock('../components/GenesisEngine', () => () => <div data-testid="view-genesis">GenesisEngine</div>);

describe('App', () => {
  it('renders the main header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Trafford Online/i })).toBeInTheDocument();
  });

  it('shows all four navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /The Mandate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Job Board/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Genesis Engine/i })).toBeInTheDocument();
  });

  it('shows The Mandate view by default', () => {
    render(<App />);
    expect(screen.getByTestId('view-mandate')).toBeInTheDocument();
    expect(screen.queryByTestId('view-stats')).not.toBeInTheDocument();
  });

  it('navigates to Live Stats tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Live Stats/i }));
    expect(screen.getByTestId('view-stats')).toBeInTheDocument();
    expect(screen.queryByTestId('view-mandate')).not.toBeInTheDocument();
  });

  it('navigates to Job Board tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Job Board/i }));
    expect(screen.getByTestId('view-jobs')).toBeInTheDocument();
    expect(screen.queryByTestId('view-mandate')).not.toBeInTheDocument();
  });

  it('navigates to Genesis Engine tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Genesis Engine/i }));
    expect(screen.getByTestId('view-genesis')).toBeInTheDocument();
    expect(screen.queryByTestId('view-mandate')).not.toBeInTheDocument();
  });

  it('renders the footer with GitHub link', () => {
    render(<App />);
    expect(screen.getByText(/Sovereign OS v1\.0/i)).toBeInTheDocument();
  });
});
