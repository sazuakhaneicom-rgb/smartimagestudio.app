export const bn = {
  app: { name: 'স্মার্ট ইমেজ স্টুডিও', tagline: 'AI দিয়ে ছবির সব কাজ এক জায়গায়' },
  upload: { title: 'ছবি আপলোড করুন', dragDrop: 'ড্র্যাগ অ্যান্ড ড্রপ করুন', orClick: 'অথবা ক্লিক করে ব্রাউজ করুন', formats: 'সাপোর্টেড ফরম্যাট: JPG, PNG, WEBP', maxSize: 'সর্বোচ্চ সাইজ: ১৫ MB', processing: 'প্রসেস হচ্ছে...' },
  settings: { title: 'সেটিংস', apiKeys: 'জেমিনি API কী সমূহ', addKey: 'নতুন কী যোগ করুন', deleteKey: 'কী মুছে ফেলুন', deleteConfirm: 'আপনি কি নিশ্চিত?', saveSettings: 'সেটিংস সেভ করুন', keyActive: 'সক্রিয়', keyStandby: 'অপেক্ষমান', keyExhausted: 'সীমা শেষ', getKeyLink: 'বিনামূল্যে API কী পান', multiKeyInfo: 'একাধিক কী যোগ করলে সীমা শেষ হলে স্বয়ংক্রিয়ভাবে পরের কী ব্যবহার হবে', enterKey: 'API কী লিখুন...' },
  layers: { title: 'লেয়ার সমূহ', background: 'ব্যাকগ্রাউন্ড', object: 'অবজেক্ট', text: 'টেক্সট', cleanBg: 'পরিষ্কার ব্যাকগ্রাউন্ড', download: 'ডাউনলোড', downloadAll: 'সব ডাউনলোড করুন (ZIP)', show: 'দেখান', hide: 'লুকান', noLayers: 'কোনো লেয়ার পাওয়া যায়নি' },
  processing: { uploading: 'আপলোড হচ্ছে...', analyzing: 'ছবি বিশ্লেষণ হচ্ছে...', separating: 'লেয়ার আলাদা হচ্ছে...', inpainting: 'ব্যাকগ্রাউন্ড পুনর্গঠন হচ্ছে...', done: 'সম্পন্ন!' },
  notifications: { keySwitched: 'কী {from}-এর সীমা শেষ, কী {to}-এ পরিবর্তন করা হয়েছে', lastKey: '⚠️ শেষ API কী ব্যবহৃত হচ্ছে!', allExhausted: 'সব API কী-এর সীমা শেষ হয়ে গেছে', addMoreKeys: 'নতুন কী যোগ করুন', tryLater: 'কিছুক্ষণ পর আবার চেষ্টা করুন', keyRecovered: 'কী {key} আবার ব্যবহারযোগ্য' },
  workspace: { newImage: 'নতুন ছবি', downloadAll: 'সব ডাউনলোড' },
  theme: { light: 'লাইট মোড', dark: 'ডার্ক মোড' },
  errors: { invalidFormat: 'এই ফরম্যাট সাপোর্টেড নয়। JPG, PNG বা WEBP ব্যবহার করুন', tooLarge: 'ফাইল সাইজ ১৫ MB-এর বেশি হতে পারবে না', noApiKey: 'অনুগ্রহ করে প্রথমে সেটিংস থেকে API কী যোগ করুন', processingFailed: 'প্রসেসিং ব্যর্থ হয়েছে, আবার চেষ্টা করুন', invalidKey: 'API কী সঠিক নয়' }
};

export type TranslationKeys = typeof bn;
