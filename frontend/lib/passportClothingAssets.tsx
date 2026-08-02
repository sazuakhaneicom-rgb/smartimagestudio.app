'use client';

import React from 'react';

export interface FormalClothingOption {
  id: string;
  label: string;
  category: 'formal' | 'suit' | 'women' | 'academic';
  img: string | null;
  shirtColor?: string;
  jacketColor?: string;
  tieColor?: string;
  sashColor?: string;
  badgeText?: string;
}

export const FORMAL_CLOTHING_LIBRARY: FormalClothingOption[] = [
  { id: 'none', label: 'কোনো পোশাক নয়', category: 'formal', img: null },
  { id: 'shirt_white', label: 'সাদা ফরমাল শার্ট', category: 'formal', img: 'shirt_white.jpg', shirtColor: '#FFFFFF', badgeText: 'White Shirt' },
  { id: 'shirt_black_tie', label: 'শার্ট + কালো টাই', category: 'formal', img: 'suit_black_tie.jpg', shirtColor: '#FFFFFF', tieColor: '#18181B', badgeText: 'Black Tie' },
  { id: 'shirt_navy_tie', label: 'শার্ট + নেভি টাই', category: 'formal', img: 'suit_navy_tie.jpg', shirtColor: '#FFFFFF', tieColor: '#1D4ED8', badgeText: 'Navy Tie' },
  { id: 'suit_red_tie', label: 'স্যুট + লাল টাই', category: 'suit', img: 'suit_red_tie.jpg', shirtColor: '#FFFFFF', jacketColor: '#18181B', tieColor: '#EF4444', badgeText: 'Red Tie' },
  { id: 'suit_black', label: 'কালো বিজনেস স্যুট', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#09090B', badgeText: 'Black Suit' },
  { id: 'suit_navy', label: 'নেভি ব্লু স্যুট', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#1E3A8A', badgeText: 'Navy Suit' },
  { id: 'suit_charcoal', label: 'চারকোল গ্রে স্যুট', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#334155', badgeText: 'Charcoal' },
  { id: 'blazer_black', label: 'কালো ব্লেজার', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#18181B', badgeText: 'Black Blazer' },
  { id: 'blazer_navy', label: 'নেভি ব্লেজার', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#2563EB', badgeText: 'Navy Blazer' },
  { id: 'blazer_grey', label: 'গ্রে ব্লেজার', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#64748B', badgeText: 'Grey Blazer' },
  { id: 'coat_black', label: 'কালো ফরমাল কোট', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#030712', badgeText: 'Formal Coat' },
  { id: 'jacket_formal', label: 'অফিসিয়াল জ্যাকেট', category: 'suit', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#1E293B', badgeText: 'Jacket' },
  { id: 'women_shirt', label: 'মহিলা ফরমাল শার্ট', category: 'women', img: 'shirt_white.jpg', shirtColor: '#FFFFFF', badgeText: 'Women Shirt' },
  { id: 'women_blazer_black', label: 'মহিলা কালো ব্লেজার', category: 'women', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#18181B', badgeText: 'Women Blazer' },
  { id: 'women_blazer_navy', label: 'মহিলা নেভি ব্লেজার', category: 'women', img: 'suit_black.jpg', shirtColor: '#FFFFFF', jacketColor: '#1E40AF', badgeText: 'Women Navy' },
  { id: 'graduation_gown', label: 'গ্র্যাজুয়েশন গাউন', category: 'academic', img: 'suit_black.jpg', jacketColor: '#09090B', sashColor: '#F59E0B', badgeText: 'Gown' }
];

export function FormalClothingVectorIcon({ option }: { option: FormalClothingOption }) {
  if (option.id === 'none') {
    return (
      <svg className="w-12 h-12 text-gray-500" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2.5" />
        <line x1="11" y1="37" x2="37" y2="11" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    );
  }

  const jacketColor = option.jacketColor || 'transparent';
  const shirtColor = option.shirtColor || '#FFFFFF';
  const tieColor = option.tieColor;
  const sashColor = option.sashColor;

  return (
    <svg className="w-14 h-14 drop-shadow-md transition-transform group-hover:scale-105" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background card glow for shirt visibility */}
      <rect x="2" y="2" width="60" height="60" rx="10" fill="#1E2235" stroke="#374151" strokeWidth="1" />

      {/* Shirt Inner Body */}
      <path d="M 22 18 L 42 18 L 46 60 L 18 60 Z" fill={shirtColor} />

      {/* Tie if present */}
      {tieColor && (
        <g>
          {/* Tie Knot */}
          <polygon points="30,22 34,22 35,26 29,26" fill={tieColor} />
          {/* Tie Body */}
          <polygon points="29,26 35,26 36,48 32,54 28,48" fill={tieColor} stroke="#FFFFFF" strokeWidth="0.5" />
        </g>
      )}

      {/* Collar */}
      <path d="M 20 16 L 29 26 L 26 16 Z" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="0.8" />
      <path d="M 44 16 L 35 26 L 38 16 Z" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="0.8" />

      {/* Jacket Shoulders & Lapels if suit/blazer/coat/gown */}
      {jacketColor !== 'transparent' && (
        <g>
          {/* Left Shoulder & Lapel */}
          <path d="M 4 38 Q 18 18 24 16 L 28 34 L 14 60 L 4 60 Z" fill={jacketColor} stroke="#4B5563" strokeWidth="0.8" />
          {/* Right Shoulder & Lapel */}
          <path d="M 60 38 Q 46 18 40 16 L 36 34 L 50 60 L 60 60 Z" fill={jacketColor} stroke="#4B5563" strokeWidth="0.8" />
          {/* Buttons & Highlights */}
          <circle cx="27" cy="46" r="1.5" fill="#D1D5DB" />
        </g>
      )}

      {/* Graduation Sash if present */}
      {sashColor && (
        <path d="M 16 28 L 22 28 L 36 60 L 30 60 Z" fill={sashColor} stroke="#FBBF24" strokeWidth="0.8" />
      )}

      {/* Transparent Neck Curve */}
      <path d="M 23 16 C 23 26, 41 26, 41 16" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}
