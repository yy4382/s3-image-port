import { useCallback } from "react";
import { useAtom } from "jotai";
import type { PrimitiveAtom } from "jotai";

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
) {
  const [state, setState] = useAtom(anAtom);
  const dispatch = useCallback(
    (action: Action) => setState((prev) => reducer(prev, action)),
    [setState, reducer],
  );
  return [state, dispatch] as const;
}
