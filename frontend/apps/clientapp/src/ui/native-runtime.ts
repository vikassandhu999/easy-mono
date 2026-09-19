import {App} from '@capacitor/app';
import {Keyboard} from '@capacitor/keyboard';
import {Network} from '@capacitor/network';
import {focusManager, onlineManager} from '@tanstack/react-query';
import {isNative} from '../api/storage';

export function deepLinkPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'easy:' || url.hostname !== 'app') {
      return null;
    }
    if (!['/', '/account', '/verify'].includes(url.pathname) && !/^\/invite\/[^/]+$/.test(url.pathname)) {
      return null;
    }
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export async function startNativeRuntime({
  navigate,
  back,
}: {
  navigate: (path: string) => Promise<void>;
  back: () => Promise<void>;
}) {
  if (!isNative) {
    return;
  }
  const open = (value: string) => {
    const path = deepLinkPath(value);
    if (path) {
      navigate(path);
    }
  };
  await App.addListener('appUrlOpen', ({url}) => open(url));
  const launch = await App.getLaunchUrl();
  if (launch) {
    open(launch.url);
  }
  await App.addListener('appStateChange', ({isActive}) => focusManager.setFocused(isActive));
  await App.addListener('backButton', ({canGoBack}) => {
    if (document.querySelector('[role="dialog"]')) {
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    } else if (canGoBack && window.location.pathname !== '/') {
      back();
    } else {
      App.minimizeApp();
    }
  });
  const status = await Network.getStatus();
  onlineManager.setOnline(status.connected);
  await Network.addListener('networkStatusChange', ({connected}) => onlineManager.setOnline(connected));
  await Keyboard.addListener('keyboardDidShow', () => {
    document.documentElement.dataset.keyboard = 'open';
  });
  await Keyboard.addListener('keyboardDidHide', () => {
    delete document.documentElement.dataset.keyboard;
  });
}
