import { Linking } from "react-native";
/**
 * Helper for opening a give URL in an external browser.
 */
export function openLinkInBrowser(url) {
    Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url));
}
//# sourceMappingURL=openLinkInBrowser.js.map