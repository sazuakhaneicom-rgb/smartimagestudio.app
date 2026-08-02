'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, 
  Camera, 
  Image as ImageIcon, 
  UserSquare2, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Scissors,
  CheckCircle2,
  Settings,
  Plus,
  QrCode,
  Printer,
  Save,
  CreditCard,
  FileBadge,
  Users,
  Plane,
  FileText,
  RectangleVertical,
  Wand2,
  Sun,
  Contrast,
  Droplet,
  Focus,
  Ban,
  UserMinus,
  UserPlus,
  UserCheck,
  UserCircle,
  ArrowUpCircle,
  Shirt,
  Ear,
  Lightbulb,
  Edit3,
  Eye,
  Glasses,
  Minus,
  Check
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { removeBackground } from '@imgly/background-removal';
import { AlertTriangle } from 'lucide-react';

type EditMode = 'manual' | 'ai';

const PHOTO_DIMENSIONS: Record<string, { w: number, h: number }> = {
  'passport': { w: 40, h: 50 },
  'dual': { w: 60, h: 40 }, 
  'visa': { w: 50, h: 50 }, 
  '2r': { w: 2.5, h: 3.5 },
  '3r': { w: 3.5, h: 5 },
  '4r': { w: 4, h: 6 },
  '5r': { w: 5, h: 7 },
  '6r': { w: 6, h: 8 },
  '8r': { w: 8, h: 10 },
  'a4': { w: 210, h: 297 },
  'letter': { w: 8.5, h: 11 },
  'epass': { w: 40, h: 50 },
  'birth': { w: 210, h: 297 }
};

const PHOTO_SIZES_MANUAL = [
  { id: 'passport', label: 'পাসপোর্ট', icon: 'UserSquare2' },
  { id: 'dual', label: 'ডুয়াল', icon: 'Users' },
  { id: 'visa', label: 'ভিসা', icon: 'Plane' },
  { id: '2r', label: '2R', icon: 'RectangleVertical' },
  { id: '3r', label: '3R', icon: 'RectangleVertical' },
  { id: '4r', label: '4R', icon: 'RectangleVertical' },
  { id: '5r', label: '5R', icon: 'RectangleVertical' },
  { id: '6r', label: '6R', icon: 'RectangleVertical' },
  { id: '8r', label: '8R', icon: 'RectangleVertical' },
  { id: 'a4', label: 'A4', icon: 'FileText' },
  { id: 'letter', label: 'Letter', icon: 'FileText' }
];

const PHOTO_SIZES_AI = [
  { id: 'passport', label: 'পাসপোর্ট', icon: 'UserSquare2' },
  { id: 'dual', label: 'ডুয়াল', icon: 'Users' },
  { id: 'epass', label: 'ই-পাস', icon: 'CreditCard' },
  { id: 'visa', label: 'ভিসা', icon: 'Plane' },
  { id: 'birth', label: 'জন্ম', icon: 'FileBadge' }
];

const AI_INSTRUCTIONS = [
  { id: 'remove_glasses', label: 'চশমা বাদ দিন', icon: 'UserMinus' },
  { id: 'keep_glasses', label: 'চশমা রাখুন', icon: 'Glasses' },
  { id: 'remove_beard', label: 'দাড়ি বাদ দিন', icon: 'UserMinus' },
  { id: 'add_beard', label: 'দাড়ি ও মোচ যোগ করুন', icon: 'UserPlus' },
  { id: 'keep_beard', label: 'দাড়ি রাখুন', icon: 'UserCheck' },
  { id: 'keep_mustache', label: 'গোঁফ রাখুন', icon: 'UserCheck' },
  { id: 'fix_hair', label: 'চুল ঠিক করুন', icon: 'RefreshCw' },
  { id: 'add_hair', label: 'চুল যোগ করুন', icon: 'UserPlus' },
  { id: 'enhance', label: 'সৌন্দর্য বৃদ্ধি', icon: 'Sparkles' },
  { id: 'open_eyes', label: 'চোখ খোলা রাখুন', icon: 'Eye' },
  { id: 'remove_cap', label: 'ক্যাপ বাদ দিন', icon: 'Ban' },
  { id: 'add_cap', label: 'টুপি যোগ করুন', icon: 'UserCircle' },
  { id: 'straighten_head', label: 'মাথা সোজা করুন', icon: 'ArrowUpCircle' },
  { id: 'keep_dress', label: 'স্কুল ড্রেস অপরিবর্তিত', icon: 'Shirt' },
  { id: 'show_ears', label: 'কান দেখান', icon: 'Ear' },
  { id: 'brighten', label: 'ছবি উজ্জ্বল করুন', icon: 'Sun' },
  { id: 'studio_light', label: 'স্টুডিও লাইটিং', icon: 'Lightbulb' },
  { id: 'look_front', label: 'সামনে তাকান', icon: 'UserSquare2' },
  { id: 'custom', label: 'কাস্টম নির্দেশনা', icon: 'Edit3' }
];

const DRESS_STYLES = [
  { id: 'none', label: 'কোনো পোশাক নয়', img: null },
  { id: 'shirt_white', label: 'সাদা শার্ট', img: 'shirt_white.jpg' },
  { id: 'polo_black', label: 'কালো পোলো', img: 'polo_black.jpg' },
  { id: 'suit_red_tie', label: 'স্যুট ও লাল টাই', img: 'suit_red_tie.jpg' },
  { id: 'suit_black', label: 'কালো স্যুট', img: 'suit_black.jpg' },
  { id: 'saree_red', label: 'শাড়ি', img: 'saree_red.jpg' },
  { id: 'hijab_black_red', label: 'হিজাব', img: 'hijab_black_red.jpg' },
  { id: 'panjabi_white', label: 'সাদা পাঞ্জাবি', img: 'panjabi_white.jpg' },
  { id: 'dress_red', label: 'লাল ড্রেস', img: 'dress_red.jpg' },
  { id: 'tshirt_blue', label: 'নীল টি-শার্ট', img: 'tshirt_blue.jpg' },
  { id: 'hijab_saree', label: 'শাড়ি + হিজাব', img: 'hijab_saree.jpg' },
  { id: 'burqa_black', label: 'কালো বোরকা', img: 'burqa_black.jpg' },
  { id: 'dress_purple', label: 'বেগুনি ড্রেস', img: 'dress_purple.jpg' },
  { id: 'dress_pattern', label: 'প্যাটার্ন ড্রেস', img: 'dress_pattern.jpg' },
  { id: 'jacket_blue', label: 'নীল জ্যাকেট', img: 'jacket_blue.jpg' }
];

// Helper to calculate initial crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function StudioMakerView() {
  const { originalImage, setOriginalImage } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dualFileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // State
  const [editMode, setEditMode] = useState<EditMode>('manual');
  const [photoSize, setPhotoSize] = useState('passport');
  const [bgColor, setBgColor] = useState('transparent');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Manual Mode State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  
  // Crop State
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  // AI Mode State
  const [aiDress, setAiDress] = useState<number | null>(null);
  const [aiInstructions, setAiInstructions] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [dualImage, setDualImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // Auto-center crop when photo size changes
  useEffect(() => {
    if (imgRef.current && photoSize && photoSize !== 'original') {
      const dim = PHOTO_DIMENSIONS[photoSize];
      if (dim) {
        const { width, height } = imgRef.current;
        if (width && height) {
          setCrop(centerAspectCrop(width, height, dim.w / dim.h));
        }
      }
    } else {
      setCrop(undefined);
    }
  }, [photoSize, originalImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalImage(URL.createObjectURL(file));
    setResultImage(null);
    setBgColor('transparent');
    setCrop(undefined);
    setCompletedCrop(null);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleDualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDualImage(URL.createObjectURL(file));
  };

  const clearWorkspace = () => {
    setOriginalImage(null);
    setResultImage(null);
    setDualImage(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setBgColor('transparent');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(0);
    setAiDress(null);
    setAiInstructions([]);
    setProgress(0);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const dim = PHOTO_DIMENSIONS[photoSize];
    if (dim) {
      setCrop(centerAspectCrop(width, height, dim.w / dim.h));
    }
  };

  // Removed duplicate useEffect - already handled above

  const toggleInstruction = (id: string) => {
    setAiInstructions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAiDressSelect = (index: number) => {
    setAiDress(index);
    const dress = DRESS_STYLES[index];
    if (dress.id === 'none') {
      showToast('পোশাক সিলেকশন বাতিল করা হয়েছে');
      return;
    }
    showToast(`"${dress.label}" সিলেক্ট করা হয়েছে। AI পোশাক পরিবর্তন শীঘ্রই সক্রিয় হবে।`);
  };

  const processAutoRemoveBg = async () => {
    if (!originalImage) return;
    if (resultImage) {
      // Allow re-running by resetting result first
      setResultImage(null);
    }
    setIsProcessing(true);
    setProgress(10);
    try {
      let simProg = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 300);
      const blob = await removeBackground(originalImage, {
        progress: (key, current, total) => setProgress(Math.round((current/total) * 100))
      });
      clearInterval(simProg);
      setProgress(100);
      
      const noBgUrl = URL.createObjectURL(blob);
      setResultImage(noBgUrl);
      setIsProcessing(false);
    } catch (error) {
      console.error(error);
      alert('Failed to remove background.');
      setIsProcessing(false);
    }
  };

  const handleBgColorClick = async (color: string) => {
    setBgColor(color);
    if (!resultImage && originalImage) {
      await processAutoRemoveBg();
    }
  };

  // Image Export Logic
  const getProcessedCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!originalImage || !imgRef.current) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = resultImage || originalImage;
    await new Promise(resolve => { image.onload = resolve; });

    // Use cropped area or full image
    let cropX = 0, cropY = 0, cropW = image.width, cropH = image.height;
    
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      const scaleX = image.width / imgRef.current.width;
      const scaleY = image.height / imgRef.current.height;
      cropX = completedCrop.x * scaleX;
      cropY = completedCrop.y * scaleY;
      cropW = completedCrop.width * scaleX;
      cropH = completedCrop.height * scaleY;
    }

    canvas.width = cropW;
    canvas.height = cropH;

    // 1. Draw Background Color
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Apply Filters and Draw Image
    ctx.filter = `brightness(${brightness}%) contrast(${contrast + sharpness * 2}%) saturate(${saturation}%)`;
    ctx.drawImage(
      image,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );
    ctx.filter = 'none';

    return canvas;
  };

  const handleDownload = async () => {
    const canvas = await getProcessedCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `StudioMaker-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = async () => {
    const canvas = await getProcessedCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const windowContent = '<!DOCTYPE html><html><head><title>Print Layout</title></head><body style="margin:0;padding:0;text-align:center;"><img src="' + dataUrl + '" style="max-width:100%;height:auto;" onload="window.print();window.close();"></body></html>';
    const printWin = window.open('', '', 'width=800,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(windowContent);
      printWin.document.close();
    }
  };

  // ---------------- UI COMPONENTS ----------------

  const renderColorSwatches = (withTransparent: boolean = false) => {
    const colors = ['#FFFFFF', '#3B82F6', '#0EA5E9', '#9CA3AF', '#2563EB', '#059669', '#FEF3C7'];
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {withTransparent && (
          <button 
            onClick={() => handleBgColorClick('transparent')} 
            className={`w-10 h-10 rounded-xl border border-gray-200 checkerboard ${bgColor === 'transparent' ? 'ring-2 ring-orange-500 scale-95' : 'hover:scale-105'} transition-all`}
            title="Transparent"
          />
        )}
        {colors.map(color => (
          <button 
            key={color}
            onClick={() => handleBgColorClick(color)}
            className={`w-10 h-10 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center ${bgColor === color ? 'ring-2 ring-orange-500 scale-95' : 'hover:scale-105'} transition-all`}
            style={{ backgroundColor: color }}
            title={color}
          >
            {bgColor === color && <CheckCircle2 className={`w-5 h-5 drop-shadow ${color === '#FFFFFF' ? 'text-gray-800' : 'text-white'}`} />}
          </button>
        ))}
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center cursor-pointer hover:scale-105 transition-all text-purple-600 relative overflow-hidden">
           <Palette className="w-5 h-5 absolute pointer-events-none" />
           <input type="color" value={bgColor !== 'transparent' ? bgColor : '#000000'} onChange={e => handleBgColorClick(e.target.value)} className="w-[150%] h-[150%] opacity-0 cursor-pointer" />
        </div>
      </div>
    );
  };

  const renderIcon = (iconName: string, active: boolean = false) => {
    const props = { className: `w-6 h-6 mb-1 transition-all ${active ? 'text-orange-500' : 'opacity-70 text-gray-500 dark:text-gray-400'}` };
    switch (iconName) {
      case 'Scissors': return <Scissors {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Sun': return <Sun {...props} />;
      case 'Settings': return <Settings {...props} />;
      case 'Glasses': return <Glasses {...props} />;
      case 'Users': return <Users {...props} />;
      case 'Plane': return <Plane {...props} />;
      case 'CreditCard': return <CreditCard {...props} />;
      case 'FileBadge': return <FileBadge {...props} />;
      case 'RectangleVertical': return <RectangleVertical {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'UserMinus': return <UserMinus {...props} />;
      case 'UserPlus': return <UserPlus {...props} />;
      case 'UserCheck': return <UserCheck {...props} />;
      case 'RefreshCw': return <RefreshCw {...props} />;
      case 'Eye': return <Eye {...props} />;
      case 'Ban': return <Ban {...props} />;
      case 'UserCircle': return <UserCircle {...props} />;
      case 'ArrowUpCircle': return <ArrowUpCircle {...props} />;
      case 'Shirt': return <Shirt {...props} />;
      case 'Ear': return <Ear {...props} />;
      case 'Lightbulb': return <Lightbulb {...props} />;
      case 'Edit3': return <Edit3 {...props} />;
      case 'UserSquare2':
      case 'User':
      default: return <UserSquare2 {...props} />;
    }
  }

  const Palette = ({className}: {className:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
  );

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500 mt-4 max-w-[1800px] mx-auto px-4">
      
      {/* Top Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 dark:bg-[#1A1128] p-1.5 rounded-2xl flex gap-2 shadow-inner border border-gray-200 dark:border-gray-800">
          <button 
            onClick={() => setEditMode('manual')}
            className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${editMode === 'manual' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-md ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            ম্যানুয়াল এডিট
          </button>
          <button 
            onClick={() => setEditMode('ai')}
            className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${editMode === 'ai' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-md ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            এআই এডিট
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px]">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="w-full lg:w-[22rem] flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar glass-panel p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1A1128]/80">
          
          {/* Photo Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200">ছবির মাপ</h3>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {(editMode === 'manual' ? PHOTO_SIZES_MANUAL : PHOTO_SIZES_AI).map(size => (
                <button 
                  key={size.id}
                  onClick={() => setPhotoSize(size.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${photoSize === size.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 shadow-sm' : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 text-gray-500 bg-white dark:bg-gray-800/50'}`}
                >
                  {renderIcon(size.icon, photoSize === size.id)}
                  <span className="text-[10px] font-bold text-center leading-tight">{size.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Colors */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200">ব্যাকগ্রাউন্ড</h3>
            </div>
            {renderColorSwatches(true)}
          </div>

          {/* Manual Mode Specifics */}
          {editMode === 'manual' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200">ব্যাকগ্রাউন্ড রিমুভ</h3>
              </div>
              <button onClick={processAutoRemoveBg} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center gap-2 transition-all shadow-sm">
                <Sparkles className="w-4 h-4 text-purple-500" /> অটো এক্সট্রাক্ট
              </button>
            </div>
          )}

          {/* AI Mode Specifics */}
          {editMode === 'ai' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">পোশাক স্টাইল</h3>
                  </div>
                  <button onClick={() => alert('পোশাক স্টাইলের সেটিংস শীঘ্রই যুক্ত করা হবে')} className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-md transition-colors">
                    <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {DRESS_STYLES.map((dress, index) => (
                    <button 
                      key={dress.id}
                      onClick={() => handleAiDressSelect(index)}
                      title={dress.label}
                      className={`aspect-[3/4] rounded-xl border flex items-center justify-center overflow-hidden transition-all bg-white dark:bg-gray-800 relative group ${aiDress === index ? 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-900/50 shadow-md' : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300'}`}
                    >
                      {dress.img ? (
                        <img src={`/dresses/${dress.img}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={dress.label} />
                      ) : (
                        <Ban className="w-8 h-8 text-gray-400 opacity-50" />
                      )}
                      {aiDress === index && (
                        <div className="absolute top-1 left-1 bg-white dark:bg-gray-800 rounded-full text-orange-500 border border-orange-500/30 p-0.5 z-10">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">অতিরিক্ত নির্দেশনা</h3>
                  </div>
                  <div 
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer hover:bg-orange-100 transition-colors border border-orange-100 dark:border-orange-800/50"
                  >
                    {aiInstructions.length}/{AI_INSTRUCTIONS.length} {showInstructions ? <Minus className="w-3 h-3 ml-1" /> : <Plus className="w-3 h-3 ml-1" />}
                  </div>
                </div>
                {showInstructions && (
                  <div className="grid grid-cols-5 gap-1.5 animate-in slide-in-from-top-2">
                    {AI_INSTRUCTIONS.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => toggleInstruction(inst.id)}
                        title={inst.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center h-[5.5rem] relative group ${aiInstructions.includes(inst.id) ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md ring-1 ring-orange-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}
                      >
                        <div className={`mb-2 p-1.5 rounded-full transition-colors ${aiInstructions.includes(inst.id) ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-600'}`}>
                           {renderIcon(inst.icon, aiInstructions.includes(inst.id))}
                        </div>
                        <span className={`text-[9px] font-bold leading-tight line-clamp-2 px-1 ${aiInstructions.includes(inst.id) ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300'}`}>{inst.label}</span>
                        {aiInstructions.includes(inst.id) && (
                           <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                             <Check className="w-2 h-2" />
                           </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* ================= MAIN WORKSPACE ================= */}
        <div className="flex-1 bg-[#151927] dark:bg-[#0A0D14] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col relative shadow-inner">
          
          <div className="absolute top-4 right-4 z-10 flex gap-2">
             {originalImage && (
               <button onClick={clearWorkspace} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md text-xs font-bold flex items-center gap-2 transition-all border border-white/10 shadow-lg">
                 <RefreshCw className="w-3.5 h-3.5" /> ক্লিয়ার
               </button>
             )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 relative h-full overflow-hidden">
             {!originalImage ? (
               <div className="w-full max-w-md animate-in zoom-in-95">
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full aspect-[3/4] border-[2px] border-dashed border-gray-600/50 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-white/5 transition-all group relative overflow-hidden"
                 >
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                   
                   <div className="absolute inset-x-8 top-8 bottom-8 border border-gray-700/30 rounded-2xl pointer-events-none"></div>

                   <div className="w-20 h-20 rounded-full bg-gray-800/80 backdrop-blur flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-900/50 transition-all shadow-xl">
                     <ImageIcon className="w-10 h-10 text-gray-400 group-hover:text-indigo-400" />
                   </div>
                   
                   <h3 className="text-2xl font-bold text-white mb-3">একটি ছবি আপলোড করুন</h3>
                   <p className="text-sm text-gray-400 text-center px-10 mb-8 leading-relaxed">ক্লিক করুন অথবা QR স্ক্যান করে মোবাইল থেকে আপলোড করুন</p>
                   
                   <button className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(249,115,22,0.3)] pointer-events-none">
                     <UploadCloud className="w-5 h-5" /> ছবি আপলোড করুন
                   </button>
                 </div>

                 {editMode === 'ai' && (
                   <div className="mt-8 flex justify-center animate-in slide-in-from-bottom-4">
                     <input type="file" ref={dualFileInputRef} onChange={handleDualFileUpload} accept="image/*" className="hidden" />
                     <button onClick={() => dualFileInputRef.current?.click()} className="px-6 py-3 bg-[#1E2235] hover:bg-[#252A40] text-orange-500 border border-orange-500/20 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:border-orange-500/40">
                       <UserSquare2 className="w-4 h-4" /> ২ টি আলাদা ছবি আপলোড করুন
                     </button>
                   </div>
                 )}
               </div>
             ) : (
               <div className="relative w-full h-full overflow-auto custom-scrollbar flex p-8 lg:p-12">
                 {isProcessing ? (
                   <div className="m-auto flex flex-col items-center text-white bg-black/50 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                     <div className="relative mb-6">
                        <div className="w-20 h-20 border-4 border-gray-700 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                        <Sparkles className="w-6 h-6 text-orange-400 absolute inset-0 m-auto animate-pulse" />
                     </div>
                     <h3 className="text-xl font-bold mb-2">এআই প্রসেসিং হচ্ছে...</h3>
                     <p className="font-medium text-gray-400 mb-6">{progress}% সম্পন্ন</p>
                     <div className="w-64 bg-gray-800 h-2 rounded-full overflow-hidden">
                       <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                     </div>
                   </div>
                 ) : (
                   <div className="m-auto flex flex-col xl:flex-row items-center justify-center gap-10">
                     <div 
                       className="relative rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all overflow-hidden border-2 border-white/10 flex items-center justify-center shrink-0"
                       style={{ 
                         backgroundColor: bgColor !== 'transparent' ? bgColor : undefined,
                         backgroundImage: bgColor === 'transparent' ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQEhjwEiqOOBhYGBgYcABcWoAE2AMmEYj8OAgN2B4DAwMgz/D8BQAw/gZ8J3oXPAAAAAASUVORK5CYII=")' : undefined
                       }}
                     >
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={(c) => setCompletedCrop(c)}
                          aspect={PHOTO_DIMENSIONS[photoSize] ? PHOTO_DIMENSIONS[photoSize].w / PHOTO_DIMENSIONS[photoSize].h : undefined}
                        >
                           <img 
                             ref={imgRef}
                             src={resultImage || originalImage} 
                             onLoad={onImageLoad}
                             className="max-h-[65vh] max-w-[80vw] w-auto object-contain relative z-10" 
                             style={{
                               filter: editMode === 'manual' 
                                 ? `brightness(${brightness}%) contrast(${contrast + sharpness * 2}%) saturate(${saturation}%)` 
                                 : undefined
                             }}
                             alt="Preview" 
                           />
                        </ReactCrop>
                     </div>
                     
                     {/* Dual Image Preview */}
                     {editMode === 'ai' && dualImage && (
                       <div className="relative rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border-2 border-white/10 flex items-center justify-center animate-in slide-in-from-right-8 shrink-0">
                         <img 
                           src={dualImage} 
                           className="max-h-[65vh] max-w-[40vw] w-auto object-contain relative z-10" 
                           alt="Dual Preview" 
                         />
                         <button onClick={() => setDualImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 z-20 transition-colors">
                           <Ban className="w-4 h-4" />
                         </button>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR ================= */}
        {(editMode === 'manual' || editMode === 'ai') && (
          <div className="w-full lg:w-[18rem] flex flex-col gap-6 shrink-0 overflow-y-auto pl-2 custom-scrollbar glass-panel p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1A1128]/80 animate-in slide-in-from-right-8 duration-300">
            
            {/* Mobile Upload Card */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#1A1C29] rounded-2xl p-4 flex flex-col gap-4 shadow-xl border border-gray-800 relative overflow-hidden group hover:border-gray-700 transition-colors cursor-pointer"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:border-white/20 transition-colors">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-[13px] leading-tight mb-0.5">মোবাইল থেকে ছবি আপলোড করুন</h4>
                  <p className="text-gray-400 text-[10px] font-medium">QR কোড স্ক্যান করুন</p>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors relative z-10 border border-white/10 group-hover:border-white/20"
              >
                <QrCode className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" /> স্ক্যান QR কোড
              </button>
            </div>

            {/* Color & Light Adjustments (Manual Only) */}
            {editMode === 'manual' && (
              <div className="flex-1 flex flex-col gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">রঙ ও আলো</h3>
                  </div>
                  
                  <div className="flex flex-col gap-5">
                    {[
                      { label: 'ব্রাইটনেস', icon: <Sun className="w-3.5 h-3.5"/>, val: brightness, set: setBrightness, min: 0, max: 200, display: brightness - 100 },
                      { label: 'কন্ট্রাস্ট', icon: <Contrast className="w-3.5 h-3.5"/>, val: contrast, set: setContrast, min: 0, max: 200, display: contrast - 100 },
                      { label: 'স্যাচুরেশন', icon: <Droplet className="w-3.5 h-3.5"/>, val: saturation, set: setSaturation, min: 0, max: 200, display: saturation - 100 },
                      { label: 'শার্পনেস', icon: <Focus className="w-3.5 h-3.5"/>, val: sharpness, set: setSharpness, min: 0, max: 10, display: sharpness, step: 0.1 }
                    ].map((filter, idx) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1.5">{filter.icon} {filter.label}</span>
                          <span className="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded text-[10px] min-w-[32px] text-center">
                            {filter.display > 0 ? `+${filter.display}` : filter.display}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min={filter.min} 
                          max={filter.max} 
                          step={filter.step || 1}
                          value={filter.val} 
                          onChange={e => filter.set(Number(e.target.value))} 
                          className="w-full accent-orange-500 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer hover:accent-orange-400 transition-all" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1"></div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto">
              <button onClick={handleDownload} className="w-full py-3.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-green-200 dark:border-green-800/50 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> ডাউনলোড
              </button>
              <button onClick={handlePrint} className="w-full py-3.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800/50 transition-colors shadow-sm">
                <Printer className="w-4 h-4" /> প্রিন্ট
              </button>
              <button 
                onClick={async () => {
                  const canvas = await getProcessedCanvas();
                  if (!canvas) return;
                  try {
                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                    if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                      showToast('ছবিটি ক্লিপবোর্ডে কপি হয়েছে!');
                    } else {
                      handleDownload();
                    }
                  } catch {
                    handleDownload();
                  }
                }} 
                className="w-full py-3.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-orange-200 dark:border-orange-800/50 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> কপি করুন
              </button>
            </div>

          </div>
        )}
      </div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md flex items-center gap-3 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
