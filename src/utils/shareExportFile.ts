import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';

async function shareFileAtPath(filePath: string, mimeType: string, fileName: string): Promise<void> {
  const url = Platform.OS === 'android' ? `file://${filePath}` : filePath;
  await Share.open({
    url,
    type: mimeType,
    filename: fileName,
    title: 'Planora export',
    subject: 'Planora data export',
    failOnCancel: false,
  });
}

export async function shareBase64File(fileName: string, base64: string, mimeType: string): Promise<void> {
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
  await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');
  await shareFileAtPath(path, mimeType, fileName);
}

export async function shareTextFile(fileName: string, contents: string, mimeType: string): Promise<void> {
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
  await ReactNativeBlobUtil.fs.writeFile(path, contents, 'utf8');
  await shareFileAtPath(path, mimeType, fileName);
}

export const EXPORT_MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
} as const;
