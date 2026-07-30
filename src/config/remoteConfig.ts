import AsyncStorage from '@react-native-async-storage/async-storage';
import remoteConfig from '@react-native-firebase/remote-config';
import { logger } from '@/utils/logger';

const DEFAULT_API_BASE =
  'https://planorabackend-production-d233.up.railway.app/api/v1';

const DEFAULT_API_ROOT =
  'https://planorabackend-production-d233.up.railway.app';

const API_BASE_KEY = 'remote_api_base_url';
const API_ROOT_KEY = 'remote_api_root_url';

let apiBaseUrl = DEFAULT_API_BASE;
let apiRootUrl = DEFAULT_API_ROOT;

export async function initializeRemoteConfig() {
  try {
    // 1. Load cached values immediately
    const cachedBase = await AsyncStorage.getItem(API_BASE_KEY);
    const cachedRoot = await AsyncStorage.getItem(API_ROOT_KEY);

    if (cachedBase) apiBaseUrl = cachedBase;
    if (cachedRoot) apiRootUrl = cachedRoot;

    // 2. Configure Remote Config
    await remoteConfig().setDefaults({
      api_base_url: DEFAULT_API_BASE,
      api_root_url: DEFAULT_API_ROOT,
    });

    // Fetch at most once every hour
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: 60 * 60 * 1000,
    });

    // 3. Fetch latest values
    const updated = await remoteConfig().fetchAndActivate();

    if (updated) {
      const newBase =
        remoteConfig().getValue('api_base_url').asString() ||
        DEFAULT_API_BASE;

      const newRoot =
        remoteConfig().getValue('api_root_url').asString() ||
        DEFAULT_API_ROOT;

      apiBaseUrl = newBase;
      apiRootUrl = newRoot;

      await AsyncStorage.multiSet([
        [API_BASE_KEY, newBase],
        [API_ROOT_KEY, newRoot],
      ]);

    } else {
      logger.info('Remote config already up to date');
    }
  } catch (error) {
    logger.warn('Remote Config failed, using cached/default URLs', error);
  }
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function getApiRootUrl() {
  return apiRootUrl;
}