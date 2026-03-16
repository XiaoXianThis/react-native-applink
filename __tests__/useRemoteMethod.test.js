const React = require('react');
const TestRenderer = require('react-test-renderer');
const {AppLinkContext} = require('../src/AppLinkContext');
const {useRemoteMethod} = require('../src/hooks/useRemoteMethod');
const {NativeAppLink} = require('../src/NativeAppLink');

function MethodCaller({name, onInvoker}) {
  const invoke = useRemoteMethod(name);
  React.useEffect(() => {
    onInvoker(invoke);
  });
  return null;
}

describe('useRemoteMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseContext = {
    appId: 'test',
    initialized: true,
    apps: [],
    routeTable: {'remote.method': 'com.remote.app'},
    addStateListener: jest.fn(() => jest.fn()),
    registerMethodHandler: jest.fn(() => jest.fn()),
    refreshRoutes: jest.fn(),
  };

  function renderCaller(ctx, props) {
    return React.createElement(
      AppLinkContext.Provider,
      {value: ctx},
      React.createElement(MethodCaller, props),
    );
  }

  it('returns a callable function', async () => {
    const onInvoker = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        renderCaller(baseContext, {name: 'remote.method', onInvoker}),
      );
    });

    const invoke = onInvoker.mock.calls[0][0];
    expect(typeof invoke).toBe('function');
  });

  it('invokes the native method with correct params', async () => {
    NativeAppLink.invokeRemoteMethod.mockResolvedValue('{"result":"ok"}');

    const onInvoker = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        renderCaller(baseContext, {name: 'remote.method', onInvoker}),
      );
    });

    const invoke = onInvoker.mock.calls[onInvoker.mock.calls.length - 1][0];

    let result;
    await TestRenderer.act(async () => {
      result = await invoke({foo: 'bar'});
    });

    expect(NativeAppLink.invokeRemoteMethod).toHaveBeenCalledWith(
      'com.remote.app',
      'remote.method',
      '{"foo":"bar"}',
    );
    expect(result).toEqual({result: 'ok'});
  });

  it('throws when method not found in route table', async () => {
    const ctx = {...baseContext, routeTable: {}};
    const onInvoker = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(
        renderCaller(ctx, {name: 'missing.method', onInvoker}),
      );
    });

    const invoke = onInvoker.mock.calls[onInvoker.mock.calls.length - 1][0];
    await expect(invoke()).rejects.toThrow('not found');
  });

  it('throws when not initialized', async () => {
    const ctx = {...baseContext, initialized: false, routeTable: {}};
    const onInvoker = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(
        renderCaller(ctx, {name: 'remote.method', onInvoker}),
      );
    });

    const invoke = onInvoker.mock.calls[onInvoker.mock.calls.length - 1][0];
    await expect(invoke()).rejects.toThrow('Not initialized');
  });

  it('throws when remote returns __error', async () => {
    NativeAppLink.invokeRemoteMethod.mockResolvedValue(
      '{"__error":true,"message":"boom"}',
    );

    const onInvoker = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        renderCaller(baseContext, {name: 'remote.method', onInvoker}),
      );
    });

    const invoke = onInvoker.mock.calls[onInvoker.mock.calls.length - 1][0];
    await expect(invoke({x: 1})).rejects.toThrow('boom');
  });
});
