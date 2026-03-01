/**
 * Jest Setup File
 * Configuration and global setup for all tests
 */

import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock fetch API
global.fetch = jest.fn();

// Mock DOM elements that might not exist in jsdom
global.HTMLDialogElement = global.HTMLDialogElement || class HTMLDialogElement {};

// Mock window methods
global.alert = jest.fn();
global.confirm = jest.fn();
global.prompt = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  document.body.innerHTML = '';
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});