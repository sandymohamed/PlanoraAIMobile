import AsyncStorage from "@react-native-async-storage/async-storage";
import remoteConfig from "@react-native-firebase/remote-config";

const API_BASE_KEY = "remote_api_base_url";
const API_ROOT_KEY = "remote_api_root_url";

let apiBaseUrl = "https://planorabackend-production-520d.up.railway.app/api/v1";
let apiRootUrl = "https://planorabackend-production-520d.up.railway.app/";

export async function initializeRemoteConfig(): Promise<void> {
  try {
    // ---------------------------------------------------------
    // Testing: clear old cached values so they cannot interfere
    // ---------------------------------------------------------

    await AsyncStorage.multiRemove([API_BASE_KEY, API_ROOT_KEY]);

    // ---------------------------------------------------------
    // Firebase Remote Config
    // ---------------------------------------------------------

    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: 0,
    });

    console.log("Fetching Firebase Remote Config...");

    const updated = await remoteConfig().fetchAndActivate();

    // ---------------------------------------------------------
    // Read values directly from Firebase
    // ---------------------------------------------------------


    const remoteBase = remoteConfig()
      .getValue("api_base_url")
      .asString();

    const remoteRoot = remoteConfig()
      .getValue("api_root_url")
      .asString();


    // ---------------------------------------------------------
    // Do NOT silently fallback while testing
    // ---------------------------------------------------------

    if (!remoteBase) {
      throw new Error("Firebase Remote Config: api_base_url is empty");
    }

    if (!remoteRoot) {
      throw new Error("Firebase Remote Config: api_root_url is empty");
    }

    if (
      !remoteBase.startsWith("http://") &&
      !remoteBase.startsWith("https://")
    ) {
      throw new Error(
        `Firebase Remote Config: api_base_url is invalid: ${remoteBase}`,
      );
    }

    if (
      !remoteRoot.startsWith("http://") &&
      !remoteRoot.startsWith("https://")
    ) {
      throw new Error(
        `Firebase Remote Config: api_root_url is invalid: ${remoteRoot}`,
      );
    }

    apiBaseUrl = remoteBase.replace(/\/+$/, "");
    apiRootUrl = remoteRoot.replace(/\/+$/, "");

    // ---------------------------------------------------------
    // Cache the confirmed Firebase values
    // ---------------------------------------------------------

    await AsyncStorage.multiSet([
      [API_BASE_KEY, apiBaseUrl],
      [API_ROOT_KEY, apiRootUrl],
    ]);

  } catch (error) {
    console.error("Remote Config initialization failed:", error);

    throw error;
  }
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function getApiRootUrl(): string {
  return apiRootUrl;
}
