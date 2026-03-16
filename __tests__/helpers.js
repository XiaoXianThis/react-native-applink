const React = require('react');
const TestRenderer = require('react-test-renderer');

function renderWithContext(contextValue, Component, props = {}) {
  const {AppLinkContext} = require('../src/AppLinkContext');
  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      React.createElement(
        AppLinkContext.Provider,
        {value: contextValue},
        React.createElement(Component, props),
      ),
    );
  });
  return renderer;
}

function renderHookWithContext(contextValue, useHookFn) {
  const results = {current: null};
  function TestComponent() {
    results.current = useHookFn();
    return null;
  }
  const renderer = renderWithContext(contextValue, TestComponent);
  return {results, renderer};
}

module.exports = {renderWithContext, renderHookWithContext};
