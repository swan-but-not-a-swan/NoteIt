import { createContext, useContext } from "react";

// How much of the bottom of the screen the floating tab bar covers. The bar
// sits over the lists rather than below them, so they can be seen through it,
// and the lists pad their ends by this much so the last row can still scroll
// clear of it. 0 everywhere the bar isn't — every screen but home.
export const BottomBarInsetContext = createContext(0);

export function useBottomBarInset(): number {
  return useContext(BottomBarInsetContext);
}
