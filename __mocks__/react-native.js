const React = require('react');

const eventListeners = new Map();

const mockNativeEventEmitter = jest.fn().mockImplementation(() => ({
  addListener: jest.fn((event, callback) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event).add(callback);
    return {
      remove: () => {
        const set = eventListeners.get(event);
        if (set) set.delete(callback);
      },
    };
  }),
  removeAllListeners: jest.fn(),
}));

const mockAppLinkModule = {
  initialize: jest.fn().mockResolvedValue(true),
  discoverApps: jest.fn().mockResolvedValue('[]'),
  registerState: jest.fn().mockResolvedValue(true),
  getLocalState: jest.fn().mockResolvedValue(null),
  setLocalState: jest.fn(),
  getRemoteState: jest.fn().mockResolvedValue(null),
  setRemoteState: jest.fn().mockResolvedValue(true),
  subscribeRemoteState: jest.fn().mockResolvedValue(true),
  unsubscribeRemoteState: jest.fn().mockResolvedValue(true),
  registerMethod: jest.fn(),
  unregisterMethod: jest.fn(),
  resolveMethodCall: jest.fn(),
  invokeRemoteMethod: jest.fn().mockResolvedValue('null'),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

module.exports = {
  NativeModules: {
    AppLinkModule: mockAppLinkModule,
  },
  NativeEventEmitter: mockNativeEventEmitter,
  Platform: {OS: 'android'},

  __TEST_EMIT__: (event, data) => {
    const set = eventListeners.get(event);
    if (set) set.forEach((cb) => cb(data));
  },
  __TEST_CLEAR_LISTENERS__: () => {
    eventListeners.clear();
  },
};
