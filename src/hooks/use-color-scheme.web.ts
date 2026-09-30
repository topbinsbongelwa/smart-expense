<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

=======
import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => undefined;

>>>>>>> 35d1dd8 (Adding home dashboard and AI assitance)
/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
<<<<<<< HEAD
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
=======
  const colorScheme = useRNColorScheme();

  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return hasHydrated ? colorScheme : 'light';
>>>>>>> 35d1dd8 (Adding home dashboard and AI assitance)
}
