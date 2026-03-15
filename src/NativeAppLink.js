import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

const {AppLinkModule} = NativeModules;

if (!AppLinkModule && Platform.OS === 'android') {
  throw new Error(
    'react-native-applink: Native module not found. ' +
      'Make sure the library is linked correctly.',
  );
}

export const NativeAppLink = AppLinkModule;

export const AppLinkEventEmitter =
  Platform.OS === 'android' && AppLinkModule
    ? new NativeEventEmitter(AppLinkModule)
    : null;
