import { colors as colorsLight } from "./colors";
import { colors as colorsDark } from "./colorsDark";
import { spacing as spacingLight } from "./spacing";
import { spacing as spacingDark } from "./spacingDark";
import { timing } from "./timing";
import { typography } from "./typography";
// Here we define our themes.
export const lightTheme = {
    colors: colorsLight,
    spacing: spacingLight,
    typography,
    timing,
    isDark: false,
};
export const darkTheme = {
    colors: colorsDark,
    spacing: spacingDark,
    typography,
    timing,
    isDark: true,
};
//# sourceMappingURL=theme.js.map