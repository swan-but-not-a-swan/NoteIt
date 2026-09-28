import { useState } from "react";
import type { ThemeColors } from "./colors";

// What a text field looks like while the caret is in it: its boundary and its
// placeholder each lift a step, so the field you are typing into is the
// brightest thing on the screen.
//
// Nothing moves and nothing resizes. A field that changed size or weight on
// focus would shove the layout around every time the keyboard opened, and the
// keyboard already does enough of that — a brighter rule and a brighter hint
// say "here" on their own.
//
// A hook rather than an entry in a stylesheet, because the state it turns on
// is the field's own focus, which nothing above the field knows about.
export function useFieldFocus(colors: ThemeColors) {
  const [focused, setFocused] = useState(false);

  return {
    focused,
    /** For whichever boundary the field already draws — a box, or one rule. */
    border: focused ? colors.accent : colors.line,
    /** For `placeholderTextColor`. */
    placeholder: focused ? colors.stone : colors.stoneDim,
    /** Spread onto the TextInput. A field with a handler of its own composes
     *  by hand instead, so neither its handler nor this one is dropped. */
    handlers: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
