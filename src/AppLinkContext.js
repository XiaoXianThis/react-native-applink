import {createContext} from 'react';

export const AppLinkContext = createContext({
  appId: null,
  initialized: false,
  apps: [],
  routeTable: {},
  addStateListener: () => () => {},
  registerMethodHandler: () => () => {},
  refreshRoutes: () => {},
});
