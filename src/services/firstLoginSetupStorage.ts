import AsyncStorage from "@react-native-async-storage/async-storage";

const FIRST_LOGIN_SETUP_STORAGE_PREFIX =
  "@planora:first_login_setup_seen";

const getStorageKey = (userId: string) =>
  `${FIRST_LOGIN_SETUP_STORAGE_PREFIX}:${userId}`;

export async function hasSeenFirstLoginSetup(
  userId: string,
): Promise<boolean> {
  const value = await AsyncStorage.getItem(getStorageKey(userId));

  return value === "true";
}

export async function markFirstLoginSetupAsSeen(
  userId: string,
): Promise<void> {
  await AsyncStorage.setItem(getStorageKey(userId), "true");
}

export async function resetFirstLoginSetup(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getStorageKey(userId));
}