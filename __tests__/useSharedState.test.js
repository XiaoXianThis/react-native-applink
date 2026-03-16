const React = require('react');
const TestRenderer = require('react-test-renderer');
const {AppLinkContext} = require('../src/AppLinkContext');
const {useSharedState} = require('../src/hooks/useSharedState');
const {NativeAppLink} = require('../src/NativeAppLink');

function StateConsumer({stateKey, defaultValue, onState}) {
  const result = useSharedState(stateKey, defaultValue);
  React.useEffect(() => {
    onState({value: result[0], setter: result[1], ready: result[2]});
  });
  return null;
}

const baseContext = {
  appId: 'test',
  initialized: true,
  apps: [],
  routeTable: {},
  addStateListener: jest.fn(() => jest.fn()),
  registerMethodHandler: jest.fn(() => jest.fn()),
  refreshRoutes: jest.fn(),
};

function renderState(contextValue, props) {
  const onState = jest.fn();
  let renderer;
  const element = React.createElement(
    AppLinkContext.Provider,
    {value: contextValue},
    React.createElement(StateConsumer, {...props, onState}),
  );
  return {onState, element};
}

describe('useSharedState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeAppLink.registerState.mockResolvedValue(true);
    NativeAppLink.getLocalState.mockResolvedValue(null);
    NativeAppLink.getRemoteState.mockResolvedValue(null);
    NativeAppLink.subscribeRemoteState.mockResolvedValue(true);
    NativeAppLink.unsubscribeRemoteState.mockResolvedValue(true);
    NativeAppLink.setLocalState.mockImplementation(() => {});
    NativeAppLink.setRemoteState.mockResolvedValue(true);
  });

  it('registers as owner when defaultValue is provided', async () => {
    const {onState, element} = renderState(
      {...baseContext, routeTable: {}},
      {stateKey: 'counter', defaultValue: 0},
    );

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    expect(NativeAppLink.registerState).toHaveBeenCalledWith('counter', '0');
  });

  it('returns stored value and ready=true when owner', async () => {
    NativeAppLink.getLocalState.mockResolvedValue('42');
    const {onState, element} = renderState(
      {...baseContext, routeTable: {}},
      {stateKey: 'counter', defaultValue: 0},
    );

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    const last = onState.mock.calls[onState.mock.calls.length - 1][0];
    expect(last.value).toBe(42);
    expect(last.ready).toBe(true);
  });

  it('subscribes to remote state when route exists and no defaultValue', async () => {
    NativeAppLink.getRemoteState.mockResolvedValue('"hello"');
    const ctx = {
      ...baseContext,
      routeTable: {greeting: 'com.other.app'},
    };
    const {onState, element} = renderState(ctx, {
      stateKey: 'greeting',
      defaultValue: undefined,
    });

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    expect(NativeAppLink.getRemoteState).toHaveBeenCalledWith(
      'com.other.app',
      'greeting',
    );
    expect(NativeAppLink.subscribeRemoteState).toHaveBeenCalledWith(
      'com.other.app',
      'greeting',
    );

    const last = onState.mock.calls[onState.mock.calls.length - 1][0];
    expect(last.value).toBe('hello');
    expect(last.ready).toBe(true);
  });

  it('is not ready when not initialized', async () => {
    const ctx = {...baseContext, initialized: false};
    const {onState, element} = renderState(ctx, {
      stateKey: 'x',
      defaultValue: undefined,
    });

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    const last = onState.mock.calls[onState.mock.calls.length - 1][0];
    expect(last.ready).toBe(false);
  });

  it('setter calls setLocalState for owner', async () => {
    NativeAppLink.getLocalState.mockResolvedValue('0');
    const {onState, element} = renderState(
      {...baseContext, routeTable: {}},
      {stateKey: 'counter', defaultValue: 0},
    );

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    const {setter} = onState.mock.calls[onState.mock.calls.length - 1][0];

    await TestRenderer.act(async () => {
      await setter(5);
    });

    expect(NativeAppLink.setLocalState).toHaveBeenCalledWith('counter', '5');
  });

  it('setter supports functional updates', async () => {
    NativeAppLink.getLocalState.mockResolvedValue('10');
    const {onState, element} = renderState(
      {...baseContext, routeTable: {}},
      {stateKey: 'counter', defaultValue: 0},
    );

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    const {setter} = onState.mock.calls[onState.mock.calls.length - 1][0];

    await TestRenderer.act(async () => {
      await setter((prev) => prev + 1);
    });

    expect(NativeAppLink.setLocalState).toHaveBeenCalled();
  });

  it('falls back to owner when remote state fetch fails', async () => {
    NativeAppLink.getRemoteState.mockRejectedValue(new Error('unreachable'));
    const ctx = {
      ...baseContext,
      routeTable: {fallback: 'com.dead.app'},
    };
    const {onState, element} = renderState(ctx, {
      stateKey: 'fallback',
      defaultValue: 'default',
    });

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    const last = onState.mock.calls[onState.mock.calls.length - 1][0];
    expect(last.value).toBe('default');
    expect(last.ready).toBe(true);
  });

  it('unsubscribes on unmount for subscriber', async () => {
    NativeAppLink.getRemoteState.mockResolvedValue('"val"');
    const ctx = {
      ...baseContext,
      routeTable: {sub: 'com.other.app'},
    };
    const {onState, element} = renderState(ctx, {
      stateKey: 'sub',
      defaultValue: undefined,
    });

    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(element);
    });

    await TestRenderer.act(async () => {
      renderer.unmount();
    });

    expect(NativeAppLink.unsubscribeRemoteState).toHaveBeenCalledWith(
      'com.other.app',
      'sub',
    );
  });

  it('registers addStateListener', async () => {
    const listenerUnsub = jest.fn();
    const mockAddListener = jest.fn(() => listenerUnsub);
    const ctx = {...baseContext, addStateListener: mockAddListener};
    const {element} = renderState(ctx, {
      stateKey: 'myKey',
      defaultValue: undefined,
    });

    await TestRenderer.act(async () => {
      TestRenderer.create(element);
    });

    expect(mockAddListener).toHaveBeenCalledWith('myKey', expect.any(Function));
  });
});
