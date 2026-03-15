import {useContext} from 'react';
import {AppLinkContext} from '../AppLinkContext';

/**
 * Discover installed ecosystem apps and their capabilities.
 *
 * Returns { apps, initialized, refresh }.
 */
export function useDiscovery() {
  const {apps, initialized, refreshRoutes} = useContext(AppLinkContext);
  return {
    apps,
    initialized,
    refresh: refreshRoutes,
  };
}
