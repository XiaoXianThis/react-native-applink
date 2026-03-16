const React = require('react');
const TestRenderer = require('react-test-renderer');
const {AppLinkProvider} = require('../src/AppLinkProvider');
const {AppLinkContext} = require('../src/AppLinkContext');
const {NativeAppLink} = require('../src/NativeAppLink');
const RN = require('react-native');

function ContextReader({onContext}) {
  const ctx = React.useContext(AppLinkContext);
  React.useEffect(() => {
    onContext(ctx);
  });
  return null;
}

describe('AppLinkProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RN.__TEST_CLEAR_LISTENERS__();
    NativeAppLink.initialize.mockResolvedValue(true);
    NativeAppLink.discoverApps.mockResolvedValue('[]');
  });

  it('calls initialize and discoverApps on mount', async () => {
    const onCtx = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(ContextReader, {onContext: onCtx}),
        ),
      );
    });

    expect(NativeAppLink.initialize).toHaveBeenCalledWith('test');
    expect(NativeAppLink.discoverApps).toHaveBeenCalled();
  });

  it('becomes initialized after discovery completes', async () => {
    const onCtx = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(ContextReader, {onContext: onCtx}),
        ),
      );
    });

    const lastCall = onCtx.mock.calls[onCtx.mock.calls.length - 1][0];
    expect(lastCall.initialized).toBe(true);
    expect(lastCall.appId).toBe('test');
  });

  it('builds route table from discovered apps', async () => {
    const apps = [
      {
        packageName: 'com.other.app',
        appName: 'Other',
        states: ['auth.token'],
        methods: ['scanner.scan'],
      },
    ];
    NativeAppLink.discoverApps.mockResolvedValue(JSON.stringify(apps));

    const onCtx = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(ContextReader, {onContext: onCtx}),
        ),
      );
    });

    const lastCall = onCtx.mock.calls[onCtx.mock.calls.length - 1][0];
    expect(lastCall.routeTable).toEqual({
      'auth.token': 'com.other.app',
      'scanner.scan': 'com.other.app',
    });
    expect(lastCall.apps).toEqual(apps);
  });

  it('still initializes when initialization fails', async () => {
    NativeAppLink.initialize.mockRejectedValue(new Error('fail'));

    const onCtx = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(ContextReader, {onContext: onCtx}),
        ),
      );
    });

    const lastCall = onCtx.mock.calls[onCtx.mock.calls.length - 1][0];
    expect(lastCall.initialized).toBe(true);
  });

  it('provides addStateListener that returns unsubscribe', async () => {
    let contextRef;
    function Capture() {
      contextRef = React.useContext(AppLinkContext);
      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(Capture),
        ),
      );
    });

    const listener = jest.fn();
    const unsub = contextRef.addStateListener('myKey', listener);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('provides registerMethodHandler that returns unregister', async () => {
    let contextRef;
    function Capture() {
      contextRef = React.useContext(AppLinkContext);
      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(Capture),
        ),
      );
    });

    const handler = jest.fn();
    const unsub = contextRef.registerMethodHandler('myMethod', handler);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('refreshRoutes re-discovers apps', async () => {
    const apps2 = [
      {packageName: 'com.new', appName: 'New', states: ['x'], methods: []},
    ];
    NativeAppLink.discoverApps
      .mockResolvedValueOnce('[]')
      .mockResolvedValueOnce(JSON.stringify(apps2));

    let contextRef;
    function Capture() {
      contextRef = React.useContext(AppLinkContext);
      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(Capture),
        ),
      );
    });

    expect(contextRef.apps).toEqual([]);

    await TestRenderer.act(async () => {
      await contextRef.refreshRoutes();
    });

    expect(contextRef.apps).toEqual(apps2);
    expect(contextRef.routeTable).toEqual({x: 'com.new'});
  });

  it('dispatches state change events to listeners', async () => {
    let contextRef;
    function Capture() {
      contextRef = React.useContext(AppLinkContext);
      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(Capture),
        ),
      );
    });

    const listener = jest.fn();
    contextRef.addStateListener('counter', listener);

    TestRenderer.act(() => {
      RN.__TEST_EMIT__('AppLink_StateChanged', {
        key: 'counter',
        value: '42',
      });
    });

    expect(listener).toHaveBeenCalledWith('42');
  });

  it('processes pending method invocations when handler registers', async () => {
    NativeAppLink.resolveMethodCall.mockImplementation(() => {});

    let contextRef;
    function Capture() {
      contextRef = React.useContext(AppLinkContext);
      return null;
    }

    await TestRenderer.act(async () => {
      TestRenderer.create(
        React.createElement(
          AppLinkProvider,
          {appId: 'test'},
          React.createElement(Capture),
        ),
      );
    });

    await TestRenderer.act(async () => {
      RN.__TEST_EMIT__('AppLink_MethodInvocation', {
        requestId: 'req1',
        method: 'lateBind',
        params: '{"x":1}',
      });
    });

    const handler = jest.fn().mockResolvedValue({ok: true});

    await TestRenderer.act(async () => {
      contextRef.registerMethodHandler('lateBind', handler);
    });

    await TestRenderer.act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(handler).toHaveBeenCalledWith({x: 1});
    expect(NativeAppLink.resolveMethodCall).toHaveBeenCalledWith(
      'req1',
      '{"ok":true}',
    );
  });
});
