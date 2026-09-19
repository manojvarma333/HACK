import { useState, useCallback } from 'react';

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [open, setOpen] = useState(initial);
  const toggle = useCallback(() => setOpen((p) => !p), []);
  return [open, toggle, setOpen];
}
