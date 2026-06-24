/**
 * useWorkoutAccordion — single-open accordion state.
 *
 * Only one workout card can be expanded at a time. Toggling the open card
 * collapses it (toggle-off). collapseAll() resets openId to null.
 */
import {useCallback, useState} from 'react';

interface WorkoutAccordionState {
  openId: string | null;
  toggle: (id: string) => void;
  collapseAll: () => void;
}

export function useWorkoutAccordion(): WorkoutAccordionState {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const collapseAll = useCallback(() => {
    setOpenId(null);
  }, []);

  return {openId, toggle, collapseAll};
}
