const {NativeModules} = require('react-native');

describe('NativeAppLink', () => {
  it('exports the native module on Android', () => {
    const {NativeAppLink} = require('../src/NativeAppLink');
    expect(NativeAppLink).toEqual(NativeModules.AppLinkModule);
    expect(NativeAppLink.initialize).toBeDefined();
    expect(NativeAppLink.discoverApps).toBeDefined();
    expect(NativeAppLink.registerState).toBeDefined();
    expect(NativeAppLink.invokeRemoteMethod).toBeDefined();
  });

  it('exports an event emitter on Android', () => {
    const {AppLinkEventEmitter} = require('../src/NativeAppLink');
    expect(AppLinkEventEmitter).not.toBeNull();
    expect(AppLinkEventEmitter.addListener).toBeDefined();
  });

  it('provides all expected native methods', () => {
    const {NativeAppLink} = require('../src/NativeAppLink');
    const expectedMethods = [
      'initialize',
      'discoverApps',
      'registerState',
      'getLocalState',
      'setLocalState',
      'getRemoteState',
      'setRemoteState',
      'subscribeRemoteState',
      'unsubscribeRemoteState',
      'registerMethod',
      'unregisterMethod',
      'resolveMethodCall',
      'invokeRemoteMethod',
    ];
    for (const method of expectedMethods) {
      expect(NativeAppLink[method]).toBeDefined();
    }
  });
});
