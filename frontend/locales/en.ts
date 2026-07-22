import { TranslationKeys } from './bn';

export const en: TranslationKeys = {
  app: { name: 'Smart Image Studio', tagline: 'Extract image layers with AI' },
  upload: { title: 'Upload Image', dragDrop: 'Drag and drop', orClick: 'or click to browse', formats: 'Supported formats: JPG, PNG, WEBP', maxSize: 'Max size: 15 MB', processing: 'Processing...' },
  settings: { title: 'Settings', apiKeys: 'Gemini API Keys', addKey: 'Add New Key', deleteKey: 'Delete Key', deleteConfirm: 'Are you sure?', saveSettings: 'Save Settings', keyActive: 'Active', keyStandby: 'Standby', keyExhausted: 'Exhausted', getKeyLink: 'Get free API key', multiKeyInfo: 'Adding multiple keys allows automatic fallback when one is exhausted', enterKey: 'Enter API key...' },
  layers: { title: 'Layers', background: 'Background', object: 'Object', text: 'Text', cleanBg: 'Clean Background', download: 'Download', downloadAll: 'Download All (ZIP)', show: 'Show', hide: 'Hide', noLayers: 'No layers found' },
  processing: { uploading: 'Uploading...', analyzing: 'Analyzing image...', separating: 'Separating layers...', inpainting: 'Reconstructing background...', done: 'Done!' },
  notifications: { keySwitched: 'Key {from} exhausted, switched to key {to}', lastKey: '⚠️ Last API key in use!', allExhausted: 'All API keys are exhausted', addMoreKeys: 'Add new keys', tryLater: 'Please try again later', keyRecovered: 'Key {key} is ready to use again' },
  workspace: { newImage: 'New Image', downloadAll: 'Download All' },
  theme: { light: 'Light Mode', dark: 'Dark Mode' },
  errors: { invalidFormat: 'Unsupported format. Use JPG, PNG, or WEBP', tooLarge: 'File size must be under 15 MB', noApiKey: 'Please add an API key in settings first', processingFailed: 'Processing failed, please try again', invalidKey: 'Invalid API key' }
};
