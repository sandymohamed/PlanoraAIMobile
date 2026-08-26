import "react-native-gesture-handler";

import {
  AppRegistry,
  I18nManager,
} from "react-native";

import {
  enableFreeze,
  enableScreens,
} from "react-native-screens";

import App from "./App";
import { name as appName } from "./app.json";

enableScreens(true);
enableFreeze(true);

// Planora manages Arabic layout manually.
// React Native's global RTL system must remain disabled.
I18nManager.allowRTL(false);
I18nManager.swapLeftAndRightInRTL(false);

if (I18nManager.isRTL) {
  I18nManager.forceRTL(false);
}

AppRegistry.registerComponent(appName, () => App);