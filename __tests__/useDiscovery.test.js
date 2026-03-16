const React = require('react');
const TestRenderer = require('react-test-renderer');
const {AppLinkContext} = require('../src/AppLinkContext');
const {useDiscovery} = require('../src/hooks/useDiscovery');

function DiscoveryConsumer({onResult}) {
  const result = useDiscovery();
  React.useEffect(() => {
    onResult(result);
  });
  return null;
}

describe('useDiscovery', () => {
  const mockApps = [
    {
      packageName: 'com.other.app',
      appName: 'Other App',
      states: ['auth.token'],
      methods: ['scanner.scan'],
    },
  ];

  const baseContext = {
    appId: 'test',
    initialized: true,
    apps: mockApps,
    routeTable: {},
    addStateListener: jest.fn(() => jest.fn()),
    registerMethodHandler: jest.fn(() => jest.fn()),
    refreshRoutes: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderDiscovery(ctx, props) {
    return React.createElement(
      AppLinkContext.Provider,
      {value: ctx},
      React.createElement(DiscoveryConsumer, props),
    );
  }

  it('returns apps from context', async () => {
    const onResult = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(renderDiscovery(baseContext, {onResult}));
    });

    const result = onResult.mock.calls[onResult.mock.calls.length - 1][0];
    expect(result.apps).toEqual(mockApps);
  });

  it('returns initialized status', async () => {
    const onResult = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(renderDiscovery(baseContext, {onResult}));
    });

    const result = onResult.mock.calls[onResult.mock.calls.length - 1][0];
    expect(result.initialized).toBe(true);
  });

  it('returns false for initialized when context is not ready', async () => {
    const ctx = {...baseContext, initialized: false};
    const onResult = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(renderDiscovery(ctx, {onResult}));
    });

    const result = onResult.mock.calls[onResult.mock.calls.length - 1][0];
    expect(result.initialized).toBe(false);
  });

  it('provides refresh function from context', async () => {
    const onResult = jest.fn();
    await TestRenderer.act(async () => {
      TestRenderer.create(renderDiscovery(baseContext, {onResult}));
    });

    const result = onResult.mock.calls[onResult.mock.calls.length - 1][0];
    expect(result.refresh).toBe(baseContext.refreshRoutes);
  });

  it('returns empty apps when none discovered', async () => {
    const ctx = {...baseContext, apps: []};
    const onResult = jest.fn();

    await TestRenderer.act(async () => {
      TestRenderer.create(renderDiscovery(ctx, {onResult}));
    });

    const result = onResult.mock.calls[onResult.mock.calls.length - 1][0];
    expect(result.apps).toEqual([]);
  });
});
