const React = require('react');
const TestRenderer = require('react-test-renderer');
const {AppLinkContext} = require('../src/AppLinkContext');
const {useSharedMethod} = require('../src/hooks/useSharedMethod');
const {NativeAppLink} = require('../src/NativeAppLink');

function MethodRegistrar({name, handler}) {
  useSharedMethod(name, handler);
  return null;
}

describe('useSharedMethod', () => {
  let mockRegisterHandler;
  let mockUnregister;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnregister = jest.fn();
    mockRegisterHandler = jest.fn(() => mockUnregister);
  });

  const baseContext = {
    appId: 'test',
    initialized: true,
    apps: [],
    routeTable: {},
    addStateListener: jest.fn(() => jest.fn()),
    registerMethodHandler: jest.fn(() => jest.fn()),
    refreshRoutes: jest.fn(),
  };

  function renderMethod(ctx, props) {
    return React.createElement(
      AppLinkContext.Provider,
      {value: ctx},
      React.createElement(MethodRegistrar, props),
    );
  }

  it('registers method on native module and context', async () => {
    const ctx = {...baseContext, registerMethodHandler: mockRegisterHandler};
    const handler = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(renderMethod(ctx, {name: 'myMethod', handler}));
    });

    expect(NativeAppLink.registerMethod).toHaveBeenCalledWith('myMethod');
    expect(mockRegisterHandler).toHaveBeenCalledWith(
      'myMethod',
      expect.any(Function),
    );
  });

  it('unregisters on unmount', async () => {
    const ctx = {...baseContext, registerMethodHandler: mockRegisterHandler};
    const handler = jest.fn();

    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        renderMethod(ctx, {name: 'myMethod', handler}),
      );
    });

    await TestRenderer.act(async () => {
      renderer.unmount();
    });

    expect(NativeAppLink.unregisterMethod).toHaveBeenCalledWith('myMethod');
    expect(mockUnregister).toHaveBeenCalled();
  });

  it('does not register when name is empty', async () => {
    const ctx = {...baseContext, registerMethodHandler: mockRegisterHandler};
    const handler = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(renderMethod(ctx, {name: '', handler}));
    });

    expect(NativeAppLink.registerMethod).not.toHaveBeenCalled();
  });

  it('does not register before initialization', async () => {
    const ctx = {
      ...baseContext,
      initialized: false,
      registerMethodHandler: mockRegisterHandler,
    };
    const handler = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(renderMethod(ctx, {name: 'myMethod', handler}));
    });

    expect(NativeAppLink.registerMethod).not.toHaveBeenCalled();
  });

  it('uses latest handler ref via stable wrapper', async () => {
    const ctx = {...baseContext, registerMethodHandler: mockRegisterHandler};
    const handler1 = jest.fn().mockResolvedValue('r1');
    const handler2 = jest.fn().mockResolvedValue('r2');

    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        renderMethod(ctx, {name: 'myMethod', handler: handler1}),
      );
    });

    await TestRenderer.act(async () => {
      renderer.update(
        renderMethod(ctx, {name: 'myMethod', handler: handler2}),
      );
    });

    const registeredHandler = mockRegisterHandler.mock.calls[0][1];
    await registeredHandler({x: 1});
    expect(handler2).toHaveBeenCalledWith({x: 1});
  });
});
