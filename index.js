import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

enableScreens(true);
enableFreeze(true);

AppRegistry.registerComponent(appName, () => App);
