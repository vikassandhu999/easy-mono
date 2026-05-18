import {useViewportSize} from '@react-aria/utils';

export function useIsMobile() {
  const {width} = useViewportSize();
  return width < 768;
}
