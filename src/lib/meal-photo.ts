import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Snap or pick a meal photo, shrink it, and ask the server (src/app/api/analyze-meal+api.ts) what's on the plate.

export type PhotoItem = {
  name: string;
  grams: number;
  confidence: 'high' | 'medium' | 'low';
  /** usda: nutrition from Ember's built-in foods; ai: the model's own estimate */
  source: 'usda' | 'ai';
  per100g: { calories: number; protein: number; carbs: number; fat: number };
};
export type PhotoEstimate = { mealName: string; notes: string; items: PhotoItem[] };

const API = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL ?? 'https://bryanjessy-ember.expo.app');
const MAX_SIDE = 1280; // plenty for the model, ~0.3 MB as JPEG

/** Returns the photo as a display URI plus base64 JPEG, or null if cancelled. */
export async function pickMealPhoto(from: 'camera' | 'library'): Promise<{ uri: string; base64: string } | null> {
  if (from === 'camera' && Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera access is off. Turn it on in Settings to snap meals.');
  }
  const launch = from === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const picked = await launch({ mediaTypes: ['images'], quality: 1 });
  if (picked.canceled || !picked.assets[0]) return null;

  const asset = picked.assets[0];
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ base64: true, compress: 0.75, format: SaveFormat.JPEG });
  if (!saved.base64) throw new Error('Couldn’t read that photo.');
  // Some platforms include the data-URI prefix; the server wants bare base64.
  return { uri: saved.uri, base64: saved.base64.replace(/^data:image\/\w+;base64,/, '') };
}

export async function analyzeMealPhoto(base64: string, hint: string): Promise<PhotoEstimate> {
  const res = await fetch(`${API}/api/analyze-meal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, hint }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Couldn’t analyse that photo. Try again.');
  return body as PhotoEstimate;
}
