import {App} from '@capacitor/app';
import {Keyboard} from '@capacitor/keyboard';
import {Network} from '@capacitor/network';
import {focusManager, onlineManager} from '@tanstack/react-query';
import {isNative} from '../api/storage';
import {restoreNativePhoto} from './photo-picker';

export function deepLinkPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'easy:' || url.hostname !== 'app') {
      return null;
    }
    if (
      ![
        '/',
        '/account',
        '/account/details',
        '/account/goal',
        '/progress',
        '/messages',
        '/verify',
        '/forms',
        '/training',
        '/nutrition',
        '/nutrition/plans',
      ].includes(url.pathname) &&
      !/^\/progress\/weight\/\d{4}-\d{2}-\d{2}$/.test(url.pathname) &&
      !/^\/nutrition\/(plans\/[^/]+|days\/\d{4}-\d{2}-\d{2}\/[a-z_]+)$/.test(url.pathname) &&
      !/^\/(invite|forms)\/[^/]+$/.test(url.pathname) &&
      !/^\/training\/(sessions\/[^/]+|plans\/[^/]+(?:\/workouts\/[^/]+)?)$/.test(url.pathname)
    ) {
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
    onlineManager.setOnline(navigator.onLine);
    return;
  }
  await App.addListener('appRestoredResult', async (event) => {
    const path = await restoreNativePhoto(event).catch(() => '/forms?photoRecovery=failed');
    if (path) {
      await navigate(path);
    }
  });
  const open = async (value: string) => {
    const path = deepLinkPath(value);
    if (path) {
      await navigate(path);
    }
  };
  await App.addListener('appUrlOpen', ({url}) => open(url));
  const launch = await App.getLaunchUrl();
  if (launch) {
    await open(launch.url);
  }
  await App.addListener('appStateChange', ({isActive}) => focusManager.setFocused(isActive));
  await App.addListener('backButton', ({canGoBack}) => {
    if (document.querySelector('[role="dialog"], [role="listbox"], [role="menu"]')) {
      (document.activeElement ?? document).dispatchEvent(
        new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', bubbles: true, cancelable: true}),
      );
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
