import '@testing-library/jest-dom';

// ResizeObserver is not available in jsdom; required by recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
