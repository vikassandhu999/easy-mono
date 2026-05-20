import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef, // Added useRef for stable set
} from 'react';

export interface DateListContextValue {
  list: Set<HTMLElement>; // The set of date separator elements
  // The function returned by useDateRef should be stable
  useDateRef: () => (node: HTMLElement | null) => void;
}

const DateListContext = createContext<DateListContextValue | undefined>(undefined);

export const DateListProvider = ({children}: PropsWithChildren) => {
  // Use a ref for the set to ensure stability across re-renders of the provider itself
  // The useState for `list` was causing the context value to change too often.
  const listRef = useRef(new Set<HTMLElement>());

  // Corrected useDateRef to match original intent for cleanup
  const stableUseDateRef = useCallback(() => {
    // This function, when called by a component, returns a ref callback
    // This returned ref callback will have `nodeToRemove` in its closure
    let nodeToRemove: HTMLElement | null = null;
    return (node: HTMLElement | null) => {
      if (nodeToRemove) {
        // If there was a previous node, remove it
        listRef.current.delete(nodeToRemove);
      }
      if (node) {
        // If a new node is provided, add it
        listRef.current.add(node);
        nodeToRemove = node; // Store it for future cleanup
      } else {
        nodeToRemove = null; // Node is null, nothing to store
      }
    };
  }, []); // listRef is stable

  const contextValue = useMemo(
    () => ({list: listRef.current, useDateRef: stableUseDateRef}),
    [stableUseDateRef], // listRef.current will be stable
  );

  return <DateListContext.Provider value={contextValue}>{children}</DateListContext.Provider>;
};

export const useDateList = (): DateListContextValue => {
  const context = useContext(DateListContext);
  if (!context) {
    throw new Error('useDateList must be used within a DateListProvider');
  }
  return context;
};
