import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock child components to test routing in isolation, without API calls
jest.mock('../components/TheMandate',    () => () => <div data-testid="view-mandate">TheMandate</div>);
jest.mock('../components/LiveSiteStats', () => () => <div data-testid="view-stats">LiveSiteStats</div>);
jest.mock('../components/JobBoard',      () => () => <div data-testid="view-jobs">JobBoard</div>);
jest.mock('../components/GenesisEngine', () => () => <div data-testid="view-genesis">GenesisEngine</div>);
jest.mock('../components/Deeds',         () => () => <div data-testid="view-deeds">Deeds</div>);
jest.mock('../components/Materials',     () => () => <div data-testid="view-materials">Materials</div>);
jest.mock('../components/Safety',        () => () => <div data-testid="view-safety">Safety</div>);
jest.mock('../components/ReWorks',       () => () => <div data-testid="view-reworks">ReWorks</div>);
jest.mock('../components/Governance',    () => () => <div data-testid="view-governance">Governance</div>);
jest.mock('../components/NodeProfile',   () => () => <div data-testid="view-profile">NodeProfile</div>);
jest.mock('../components/Login',         () => () => <div data-testid="login-btn">Login</div>);

describe('App', () => {
  it('renders the main header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Trafford Online/i })).toBeInTheDocument();
  });

  it('shows all ten navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /The Mandate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Job Board/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Genesis Engine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deeds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Materials/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Safety/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-Works/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Governance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Profile/i })).toBeInTheDocument();
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

  it('navigates to Deeds tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Deeds/i }));
    expect(screen.getByTestId('view-deeds')).toBeInTheDocument();
    expect(screen.queryByTestId('view-mandate')).not.toBeInTheDocument();
  });

  it('navigates to Materials tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Materials/i }));
    expect(screen.getByTestId('view-materials')).toBeInTheDocument();
  });

  it('navigates to Safety tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Safety/i }));
    expect(screen.getByTestId('view-safety')).toBeInTheDocument();
  });

  it('navigates to Re-Works tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Re-Works/i }));
    expect(screen.getByTestId('view-reworks')).toBeInTheDocument();
  });

  it('navigates to Governance tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Governance/i }));
    expect(screen.getByTestId('view-governance')).toBeInTheDocument();
  });

  it('navigates to My Profile tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /My Profile/i }));
    expect(screen.getByTestId('view-profile')).toBeInTheDocument();
  });

  it('shows the Login component when not authenticated', () => {
    render(<App />);
    expect(screen.getByTestId('login-btn')).toBeInTheDocument();
  });

  it('renders the footer with GitHub link', () => {
    render(<App />);
    expect(screen.getByText(/Sovereign OS v1\.0/i)).toBeInTheDocument();
  });
});

