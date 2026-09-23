import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** True when the device reports an active path to the internet. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable;
      setOnline(connected && reachable !== false);
    });
    return unsub;
  }, []);

  return online;
}
