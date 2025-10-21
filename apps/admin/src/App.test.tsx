import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock components
vi.mock('./components/UserManagement', () => ({
  default: () => <div data-testid="user-management">User Management</div>,
}));

vi.mock('./components/RLSPolicyViewer', () => ({
  default: () => <div data-testid="rls-viewer">RLS Policy Viewer</div>,
}));

describe('Admin App', () => {
  it('renders header with title', () => {
    render(<App />);
    
    expect(screen.getByText(/Mental Scribe Admin/i)).toBeDefined();
  });

  it('renders navigation tabs', () => {
    render(<App />);
    
    expect(screen.getByText(/User Management/i)).toBeDefined();
    expect(screen.getByText(/RLS Policies/i)).toBeDefined();
  });

  it('renders UserManagement by default', () => {
    render(<App />);
    
    expect(screen.getByTestId('user-management')).toBeDefined();
  });
});
