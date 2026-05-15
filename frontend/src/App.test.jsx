import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

describe('App UI', () => {
  it('renders the mode switch buttons', () => {
    render(<App />);
    expect(screen.getByText(/Single File Filter/i)).toBeInTheDocument();
    expect(screen.getByText(/Reference File Filter/i)).toBeInTheDocument();
  });

  it('switches to reference mode when clicked', async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Reference File Filter/i));
    expect(await screen.findByText(/Step 1: Upload Reference File/i)).toBeInTheDocument();
  });
});
