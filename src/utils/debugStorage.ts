// utils/debugStorage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export async function logAllStorage(where: string) {
  console.log(`\n========== ${where} ==========`);

  // AsyncStorage
  const keys = await AsyncStorage.getAllKeys();

  console.log('AsyncStorage Keys:', keys);

  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);

    console.log(`\n${key}`);
    console.log(value);
  }

  // Keychain
  const creds = await Keychain.getGenericPassword();

  console.log('\nKeychain');
  console.log(creds);

  console.log('==============================\n');
}