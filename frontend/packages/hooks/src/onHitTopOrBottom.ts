export const onHitTopOrBottom = (
  scrollingElement: HTMLElement | null,
  onHitTop: () => void,
  onHitBottom: () => void,
) => {
  const onScroll = (event: Event) => {
    const element = event.target as HTMLElement;
    const scrollPosition = Math.ceil(element.scrollTop);
    const scrollEnd = element.offsetHeight + scrollPosition;
    const hitTop = scrollPosition <= 0;
    const hitBottom = scrollEnd >= element.scrollHeight;

    if (hitTop) {
      onHitTop();
    } else if (hitBottom) {
      onHitBottom();
    }
  };

  const onMouseWheel = ({ currentTarget, deltaY }: WheelEvent) => {
    const element = currentTarget as HTMLElement;
    const isScrollable = element.scrollHeight > element.clientHeight;

    if (isScrollable) {
      // if the element is scrollable, the scroll event will take the relay
      return true;
    }

    const isScrollingUp = deltaY > 0;

    if (isScrollingUp) {
      return onHitTop();
    }

    return onHitBottom();
  };

  if (scrollingElement) {
    scrollingElement.addEventListener('scroll', onScroll);
    scrollingElement.addEventListener('wheel', onMouseWheel);
  }
};
