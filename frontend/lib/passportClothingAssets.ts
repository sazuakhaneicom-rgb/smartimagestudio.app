'use client';

export interface FormalClothingOption {
  id: string;
  label: string;
  category: 'formal' | 'suit' | 'women' | 'academic';
  img: string | null;
  tieColor?: string;
  jacketColor?: string;
}

export const FORMAL_CLOTHING_LIBRARY: FormalClothingOption[] = [
  { id: 'none', label: 'কোনো পোশাক নয়', category: 'formal', img: null },
  { id: 'shirt_white', label: 'সাদা ফরমাল শার্ট', category: 'formal', img: 'shirt_white.jpg' },
  { id: 'shirt_black_tie', label: 'শার্ট + কালো টাই', category: 'formal', img: 'suit_black_tie.jpg', tieColor: '#1F2937' },
  { id: 'shirt_navy_tie', label: 'শার্ট + নেভি টাই', category: 'formal', img: 'suit_navy_tie.jpg', tieColor: '#1E3A8A' },
  { id: 'suit_red_tie', label: 'স্যুট + লাল টাই', category: 'suit', img: 'suit_red_tie.jpg', tieColor: '#DC2626', jacketColor: '#111827' },
  { id: 'suit_black', label: 'কালো বিজনেস স্যুট', category: 'suit', img: 'suit_black.jpg', jacketColor: '#111827' },
  { id: 'suit_navy', label: 'নেভি ব্লু স্যুট', category: 'suit', img: 'suit_black.jpg', jacketColor: '#1E3A8A' },
  { id: 'suit_charcoal', label: 'চারকোল গ্রে স্যুট', category: 'suit', img: 'suit_black.jpg', jacketColor: '#374151' },
  { id: 'blazer_black', label: 'কালো ব্লেজার', category: 'suit', img: 'suit_black.jpg', jacketColor: '#1F2937' },
  { id: 'blazer_navy', label: 'নেভি ব্লেজার', category: 'suit', img: 'suit_black.jpg', jacketColor: '#1E40AF' },
  { id: 'blazer_grey', label: 'গ্রে ব্লেজার', category: 'suit', img: 'suit_black.jpg', jacketColor: '#4B5563' },
  { id: 'coat_black', label: 'কালো ফরমাল কোট', category: 'suit', img: 'suit_black.jpg', jacketColor: '#0F172A' },
  { id: 'jacket_formal', label: 'অফিসিয়াল জ্যাকেট', category: 'suit', img: 'suit_black.jpg', jacketColor: '#1E293B' },
  { id: 'women_shirt', label: 'মহিলা ফরমাল শার্ট', category: 'women', img: 'shirt_white.jpg' },
  { id: 'women_blazer_black', label: 'মহিলা কালো ব্লেজার', category: 'women', img: 'suit_black.jpg', jacketColor: '#1F2937' },
  { id: 'women_blazer_navy', label: 'মহিলা নেভি ব্লেজার', category: 'women', img: 'suit_black.jpg', jacketColor: '#1E3A8A' },
  { id: 'graduation_gown', label: 'গ্র্যাজুয়েশন গাউন', category: 'academic', img: 'suit_black.jpg', jacketColor: '#09090B' }
];
