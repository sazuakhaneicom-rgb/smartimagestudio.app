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
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Sliders,
  ShieldCheck,
  Maximize2,
  SlidersHorizontal
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { removeBackground } from '@imgly/background-removal';
import { AlertTriangle } from 'lucide-react';
import { processCanvasPipeline, getCSSFilterString, downloadCanvas, ExportFormat, ImageAdjustments } from '@/lib/imageProcessor';
import { 
  processAdvancedCanvas, 
  getExtendedCSSFilterString, 
  ManualEditorAdjustments, 
  defaultManualAdjustments, 
  TransformState, 
  defaultTransformState, 
  BackgroundConfig, 
  defaultBackgroundConfig 
} from '@/lib/manualEditorEngine';
import { processAiClothingChange } from '@/lib/aiClothingEngine';

type EditMode = 'manual' | 'ai';

const PHOTO_DIMENSIONS: Record<string, { w: number, h: number, name: string, unit: string } | null> = {
  'original': null,
  'passport': { w: 35, h: 45, name: 'পাসপোর্ট', unit: '৩৫ × ৪৫ মিমি' },
  'dual': { w: 35, h: 45, name: 'ডুয়াল', unit: '৩৫ × ৪৫ মিমি' },
  'visa': { w: 51, h: 51, name: 'ভিসা', unit: '৫০ × ৫০ মিমি' }, 
  '2r': { w: 64, h: 89, name: '2R', unit: '৬৪ × ৮৯ মিমি' },
  '3r': { w: 89, h: 127, name: '3R', unit: '৮৯ × ১২৭ মিমি' },
  '4r': { w: 102, h: 152, name: '4R', unit: '১০২ × ১৫২ মিমি' },
  '5r': { w: 127, h: 178, name: '5R', unit: '১২৭ × ১৭৮ মিমি' },
  '6r': { w: 152, h: 203, name: '6R', unit: '১৫২ × ২০৩ মিমি' },
  '8r': { w: 203, h: 254, name: '8R', unit: '২০৩ × ২৫৪ মিমি' },
  'a4': { w: 210, h: 297, name: 'A4', unit: '২১০ × ২৯৭ মিমি' },
  'letter': { w: 216, h: 279, name: 'Letter', unit: '২১৬ × ২৭৯ মিমি' },
  'epass': { w: 35, h: 45, name: 'ই-পাসপোর্ট', unit: '৩৫ × ৪৫ মিমি' },
  'birth': { w: 35, h: 45, name: 'জন্ম নিবন্ধন', unit: '৩৫ × ৪৫ মিমি' }
};

const PHOTO_SIZES_MANUAL = [
  { id: 'original', label: 'অরিজিনাল', icon: 'ImageIcon' },
  { id: 'passport', label: 'পাসপোর্ট', icon: 'UserSquare2' },
  { id: 'dual', label: 'ডুয়াল', icon: 'Users' },
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
  { id: 'original', label: 'অরিজিনাল', icon: 'ImageIcon' },
  { id: 'passport', label: 'পাসপোর্ট', icon: 'UserSquare2' },
  { id: 'dual', label: 'ডুয়াল', icon: 'Users' },
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
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number | undefined) {
  if (!aspect) return undefined;
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
  const [photoSize, setPhotoSize] = useState('original');
  const [bgColor, setBgColor] = useState('transparent');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');

  // Manual Mode State (18 Full Sliders + RGB + Transforms + Protection)
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [exposure, setExposure] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [whites, setWhites] = useState(0);
  const [blacks, setBlacks] = useState(0);
  const [gamma, setGamma] = useState(1.0);

  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [vibrance, setVibrance] = useState(0);
  const [hue, setHue] = useState(0);

  const [sharpness, setSharpness] = useState(0);
  const [structure, setStructure] = useState(0);
  const [texture, setTexture] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [opacity, setOpacity] = useState(100);

  const [redBalance, setRedBalance] = useState(0);
  const [greenBalance, setGreenBalance] = useState(0);
  const [blueBalance, setBlueBalance] = useState(0);

  const [faceProtection, setFaceProtection] = useState(false);
  const [textProtection, setTextProtection] = useState(false);

  // Transform State
  const [transform, setTransform] = useState<TransformState>(defaultTransformState);

  // Background State
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(defaultBackgroundConfig);
  const [isBlurBg, setIsBlurBg] = useState(false);

  // Control Tab State (Right Sidebar Tabs)
  const [activeTab, setActiveTab] = useState<'light' | 'color' | 'detail' | 'rgb' | 'transform' | 'protection'>('light');

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(100);

  // Export Format State
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Crop State
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  // AI Mode State
  const [aiDress, setAiDress] = useState<number | null>(null);
  const [aiInstructions, setAiInstructions] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [dualImage, setDualImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // Helper to apply crop for a given size
  const applyCropForSize = useCallback((sizeId: string) => {
    const dim = PHOTO_DIMENSIONS[sizeId];
    if (!dim) {
      setCrop(undefined);
      setCompletedCrop(null);
      return;
    }
    if (imgRef.current) {
      const imgW = imgRef.current.width;
      const imgH = imgRef.current.height;
      if (imgW && imgH) {
        const aspect = dim.w / dim.h;
        let cropW = 80;
        let cropH = 80;
        const imgAspect = imgW / imgH;
        
        if (imgAspect > aspect) {
          cropH = 85;
          cropW = (cropH * aspect) / imgAspect;
        } else {
          cropW = 85;
          cropH = (cropW * imgAspect) / aspect;
        }

        const percentCrop: CropType = {
          unit: '%',
          width: cropW,
          height: cropH,
          x: (100 - cropW) / 2,
          y: (100 - cropH) / 2
        };
        setCrop(percentCrop);

        // Pre-calculate completed pixel crop so export works without manual dragging
        const pixelCrop: PixelCrop = {
          unit: 'px',
          x: (percentCrop.x * imgW) / 100,
          y: (percentCrop.y * imgH) / 100,
          width: (percentCrop.width * imgW) / 100,
          height: (percentCrop.height * imgH) / 100
        };
        setCompletedCrop(pixelCrop);
      }
    }
  }, []);

  // Handle size selection button click
  const handlePhotoSizeChange = (sizeId: string) => {
    setPhotoSize(sizeId);
    applyCropForSize(sizeId);
    const dim = PHOTO_DIMENSIONS[sizeId];
    if (dim) {
      showToast(`${dim.name} সাইজ সিলেক্ট করা হয়েছে (${dim.unit})`);
    } else {
      showToast('অরিজিনাল সাইজ সিলেক্ট করা হয়েছে (সম্পূর্ণ ছবি)');
    }
  };

  // Auto-center crop when photo size changes
  useEffect(() => {
    applyCropForSize(photoSize);
  }, [photoSize, applyCropForSize]);

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
    setExposure(0);
    setHighlights(0);
    setShadows(0);
    setTemperature(0);
    setTint(0);
    setGamma(1.0);
    setIsBlurBg(false);
    setZoomLevel(100);
    setAiDress(null);
    setAiInstructions([]);
    setProgress(0);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    applyCropForSize(photoSize);
  }, [photoSize, applyCropForSize]);

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

  const handleAiDressSelect = async (index: number) => {
    if (isProcessing) return; // Prevent duplicate clicks during processing
    setAiDress(index);
    const dress = DRESS_STYLES[index];
    if (dress.id === 'none') {
      setResultImage(null);
      setDualImage(null);
      showToast('পোশাক সিলেকশন বাতিল করা হয়েছে');
      return;
    }

    if (!originalImage) {
      showToast('অনুগ্রহ করে প্রথমে একটি ছবি আপলোড করুন');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setProcessingStage('ছবি বিশ্লেষণ ও ফেস সনাক্তকরণ হচ্ছে...');

    try {
      const generatedImage = await processAiClothingChange(
        originalImage,
        dress.img || 'shirt_white.jpg',
        aiInstructions,
        (prog, stage) => {
          setProgress(prog);
          setProcessingStage(stage);
        }
      );

      setResultImage(generatedImage);
      setDualImage(originalImage);
      showToast(`"${dress.label}" সফলভাবে তৈরি করা হয়েছে!`);
    } catch (err) {
      console.error('AI Clothing error:', err);
      showToast('পোশাক পরিবর্তন ব্যর্থ হয়েছে, পুনরায় চেষ্টা করুন।');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
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

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = resultImage || originalImage;
    await new Promise(resolve => { image.onload = resolve; });

    let cropArea = null;
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      const scaleX = image.width / imgRef.current.width;
      const scaleY = image.height / imgRef.current.height;
      cropArea = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY
      };
    }

    const currentAdjustments: ManualEditorAdjustments = {
      brightness,
      contrast,
      exposure,
      highlights,
      shadows,
      whites,
      blacks,
      gamma,
      temperature,
      tint,
      saturation,
      vibrance,
      hue,
      sharpness,
      structure,
      texture,
      clarity,
      opacity,
      redBalance,
      greenBalance,
      blueBalance,
      faceProtection,
      textProtection
    };

    const currentBgConfig: BackgroundConfig = isBlurBg ? { type: 'blur', color: 'transparent' } : {
      type: bgColor === 'transparent' ? 'transparent' : 'solid',
      color: bgColor
    };

    return processAdvancedCanvas(
      image,
      cropArea,
      currentBgConfig,
      currentAdjustments,
      transform
    );
  };

  const handleDownload = async () => {
    const canvas = await getProcessedCanvas();
    if (!canvas) return;
    downloadCanvas(canvas, `StudioMaker-${Date.now()}`, exportFormat);
    showToast(`ছবিটি ${exportFormat.toUpperCase()} ফরমেটে ডাউনলোড হয়েছে!`);
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
    const colors = ['#FFFFFF', '#000000', '#3B82F6', '#0EA5E9', '#9CA3AF', '#059669', '#FEF3C7'];
    return (
      <div className="flex flex-col gap-3 mt-3">
        <div className="flex flex-wrap gap-2">
          {withTransparent && (
            <button 
              onClick={() => handleBgColorClick('transparent')} 
              className={`w-9 h-9 rounded-xl border border-gray-200 checkerboard ${bgColor === 'transparent' && !isBlurBg ? 'ring-2 ring-orange-500 scale-95' : 'hover:scale-105'} transition-all`}
              title="Transparent"
            />
          )}
          {colors.map(color => (
            <button 
              key={color}
              onClick={() => { setIsBlurBg(false); handleBgColorClick(color); }}
              className={`w-9 h-9 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center ${bgColor === color && !isBlurBg ? 'ring-2 ring-orange-500 scale-95' : 'hover:scale-105'} transition-all`}
              style={{ backgroundColor: color }}
              title={color}
            >
              {bgColor === color && !isBlurBg && <CheckCircle2 className={`w-4 h-4 drop-shadow ${color === '#FFFFFF' ? 'text-gray-800' : 'text-white'}`} />}
            </button>
          ))}
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center cursor-pointer hover:scale-105 transition-all text-purple-600 relative overflow-hidden">
             <Palette className="w-4 h-4 absolute pointer-events-none" />
             <input type="color" value={bgColor !== 'transparent' ? bgColor : '#000000'} onChange={e => { setIsBlurBg(false); handleBgColorClick(e.target.value); }} className="w-[150%] h-[150%] opacity-0 cursor-pointer" />
          </div>
        </div>
        
        {/* Background Blur Toggle Button */}
        <button
          onClick={() => {
            setIsBlurBg(!isBlurBg);
            showToast(!isBlurBg ? 'ব্যাকগ্রাউন্ড ব্লার সক্রিয় হয়েছে' : 'ব্লার বন্ধ করা হয়েছে');
          }}
          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${isBlurBg ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/20' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700'}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> {isBlurBg ? '✓ ব্যাকগ্রাউন্ড ব্লার (অন)' : 'ব্যাকগ্রাউন্ড ব্লার যুক্ত করুন'}
        </button>
      </div>
    );
  };

  const renderIcon = (iconName: string, active: boolean = false) => {
    const props = { className: `w-6 h-6 mb-1 transition-all ${active ? 'text-orange-500' : 'opacity-70 text-gray-500 dark:text-gray-400'}` };
    switch (iconName) {
      case 'ImageIcon': return <ImageIcon {...props} />;
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
    <div className="w-full h-full animate-in fade-in duration-500 max-w-[2560px] mx-auto px-2 sm:px-4 flex flex-col flex-1">
      
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

      <div className="flex flex-col lg:flex-row gap-4 xl:gap-6 flex-1 min-h-[calc(100vh-170px)]">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="w-full lg:w-72 xl:w-80 2xl:w-96 flex flex-col gap-4 xl:gap-5 shrink-0 overflow-y-auto pr-2 custom-scrollbar glass-panel p-3.5 xl:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1A1128]/80">
          
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
                  onClick={() => handlePhotoSizeChange(size.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${photoSize === size.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 shadow-sm ring-1 ring-orange-500' : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 text-gray-500 bg-white dark:bg-gray-800/50'}`}
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

        {/* ================= MAIN WORKSPACE (FIXED ARTBOARD SYSTEM) ================= */}
        <div className="flex-1 bg-[#151927] dark:bg-[#0A0D14] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col relative shadow-inner h-full min-h-0 max-h-[calc(100vh-160px)]">
          
          <div className="absolute top-4 right-4 z-10 flex gap-2">
             {originalImage && (
               <button onClick={clearWorkspace} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md text-xs font-bold flex items-center gap-2 transition-all border border-white/10 shadow-lg">
                 <RefreshCw className="w-3.5 h-3.5" /> ক্লিয়ার
               </button>
             )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 relative h-full min-h-0 overflow-hidden">
             {!originalImage ? (
               <div className="w-full max-w-md animate-in zoom-in-95">
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full aspect-[3/4] max-h-[calc(100vh-250px)] border-[2px] border-dashed border-gray-600/50 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-white/5 transition-all group relative overflow-hidden"
                 >
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                   
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
                <div 
                  onWheel={(e) => {
                    setZoomLevel(prev => Math.max(30, Math.min(300, prev + (e.deltaY < 0 ? 10 : -10))));
                  }}
                  className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center p-2 select-none min-h-0"
                >
                  {/* Header Bar: Current Active Size Indicator Badge + Interactive Zoom Controls */}
                  <div className="mb-3 flex flex-wrap items-center justify-center gap-3 z-20">
                    <div className="px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-semibold flex items-center gap-2 border border-white/10 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                      <span>সাইজ: {PHOTO_DIMENSIONS[photoSize]?.name || 'অরিজিনাল'}</span>
                      {PHOTO_DIMENSIONS[photoSize]?.unit && (
                        <span className="text-orange-400 font-mono text-[11px]">({PHOTO_DIMENSIONS[photoSize]?.unit})</span>
                      )}
                    </div>

                    <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs flex items-center gap-2 border border-white/10 shadow-lg">
                      <button 
                        onClick={() => setZoomLevel(prev => Math.max(30, prev - 10))} 
                        className="p-1 hover:bg-white/20 rounded transition-colors text-orange-400"
                        title="জুম আউট (-)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-[11px] min-w-[34px] text-center font-bold">{zoomLevel}%</span>
                      <button 
                        onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))} 
                        className="p-1 hover:bg-white/20 rounded transition-colors text-orange-400"
                        title="জুম ইন (+)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setZoomLevel(100)} 
                        className="ml-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold transition-colors text-gray-200"
                      >
                        ফিট
                      </button>
                    </div>
                  </div>

                  {isProcessing ? (
                    <div className="m-auto flex flex-col items-center text-white bg-black/50 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                      <div className="relative mb-6">
                         <div className="w-20 h-20 border-4 border-gray-700 rounded-full"></div>
                         <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                         <Sparkles className="w-6 h-6 text-orange-400 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold mb-1 text-center px-4">{processingStage || 'এআই প্রসেসিং হচ্ছে...'}</h3>
                      <p className="font-semibold text-orange-400 text-sm mb-6">{progress}% সম্পন্ন</p>
                      <div className="w-64 bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="m-auto flex flex-col xl:flex-row items-center justify-center gap-6 max-h-full max-w-full overflow-hidden">
                      <div 
                        className="relative rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] transition-all overflow-hidden border-2 border-white/10 flex items-center justify-center shrink-0"
                        style={{ 
                          backgroundColor: bgColor !== 'transparent' ? bgColor : undefined,
                          backgroundImage: bgColor === 'transparent' ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQEhjwEiqOOBhYGBgYcABcWoAE2AMmEYj8OAgN2B4DAwMgz/D8BQAw/gZ8J3oXPAAAAAASUVORK5CYII=")' : undefined
                        }}
                      >
                         <ReactCrop
                           crop={crop}
                           onChange={(_, percentCrop) => setCrop(percentCrop)}
                           onComplete={(c) => setCompletedCrop(c)}
                           aspect={PHOTO_DIMENSIONS[photoSize] ? PHOTO_DIMENSIONS[photoSize]!.w / PHOTO_DIMENSIONS[photoSize]!.h : undefined}
                         >
                            <img 
                              ref={imgRef}
                              src={resultImage || originalImage} 
                              onLoad={onImageLoad}
                              className="max-h-[50vh] sm:max-h-[58vh] lg:max-h-[64vh] xl:max-h-[70vh] 2xl:max-h-[74vh] max-w-[95%] w-auto h-auto object-contain relative z-10 transition-transform duration-200" 
                              style={{
                                transform: `scale(${zoomLevel / 100})`,
                                filter: editMode === 'manual' 
                                  ? getCSSFilterString({ brightness, contrast, saturation, sharpness, exposure, highlights, shadows, temperature, tint, gamma }) 
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
          <div className="w-full lg:w-72 xl:w-80 2xl:w-96 flex flex-col gap-4 xl:gap-5 shrink-0 overflow-y-auto pl-2 custom-scrollbar glass-panel p-3.5 xl:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1A1128]/80 animate-in slide-in-from-right-8 duration-300">
            
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

            {/* Tabbed Controls for Manual Mode */}
            {editMode === 'manual' && (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Control Tabs Header (High Contrast & Zero Layout Shift) */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-gray-900/80 rounded-xl border border-gray-700/80 shrink-0 shadow-inner">
                  {[
                    { id: 'light', label: 'আলো', icon: <Sun className="w-3.5 h-3.5" /> },
                    { id: 'color', label: 'রঙ', icon: <Droplet className="w-3.5 h-3.5" /> },
                    { id: 'detail', label: 'ডিটেইল', icon: <Focus className="w-3.5 h-3.5" /> },
                    { id: 'rgb', label: 'RGB', icon: <Sliders className="w-3.5 h-3.5" /> },
                    { id: 'transform', label: 'ট্রান্সফর্ম', icon: <RotateCw className="w-3.5 h-3.5" /> },
                    { id: 'protection', label: 'সুরক্ষা', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                        activeTab === tab.id 
                          ? 'bg-orange-500 text-white shadow-md font-extrabold' 
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3 min-h-[160px]">
                  {/* TAB 1: Light & Exposure */}
                  {activeTab === 'light' && (
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                      {[
                        { label: 'ব্রাইটনেস', icon: <Sun className="w-3 h-3"/>, val: brightness, set: setBrightness, min: 0, max: 200, display: brightness - 100 },
                        { label: 'কন্ট্রাস্ট', icon: <Contrast className="w-3 h-3"/>, val: contrast, set: setContrast, min: 0, max: 200, display: contrast - 100 },
                        { label: 'এক্সপোজার', icon: <Sun className="w-3 h-3"/>, val: exposure, set: setExposure, min: -100, max: 100, display: exposure },
                        { label: 'হাইলাইটস', icon: <Sun className="w-3 h-3"/>, val: highlights, set: setHighlights, min: -100, max: 100, display: highlights },
                        { label: 'শ্যাডো', icon: <Contrast className="w-3 h-3"/>, val: shadows, set: setShadows, min: -100, max: 100, display: shadows },
                        { label: 'হোয়াইটস', icon: <Sun className="w-3 h-3"/>, val: whites, set: setWhites, min: -100, max: 100, display: whites },
                        { label: 'ব্ল্যাকস', icon: <Contrast className="w-3 h-3"/>, val: blacks, set: setBlacks, min: -100, max: 100, display: blacks },
                        { label: 'গামা', icon: <Focus className="w-3 h-3"/>, val: gamma, set: setGamma, min: 0.2, max: 2.2, step: 0.1, display: Math.round((gamma - 1) * 100) }
                      ].map((filter, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-300">
                            <span className="flex items-center gap-1 truncate">{filter.icon} {filter.label}</span>
                            <span className="text-orange-400 font-mono text-[9px] min-w-[24px] text-right font-bold">
                              {filter.display > 0 ? `+${filter.display}` : filter.display}%
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min={filter.min} 
                            max={filter.max} 
                            step={(filter as any).step || 1}
                            value={filter.val} 
                            onChange={e => filter.set(Number(e.target.value))} 
                            className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:accent-orange-400 transition-all" 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 2: Color & Tone */}
                  {activeTab === 'color' && (
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                      {[
                        { label: 'স্যাচুরেশন', icon: <Droplet className="w-3 h-3"/>, val: saturation, set: setSaturation, min: 0, max: 200, display: saturation - 100 },
                        { label: 'ভাইব্রেন্স', icon: <Sparkles className="w-3 h-3"/>, val: vibrance, set: setVibrance, min: -100, max: 100, display: vibrance },
                        { label: 'টেম্পারেচার', icon: <Sun className="w-3 h-3"/>, val: temperature, set: setTemperature, min: -100, max: 100, display: temperature },
                        { label: 'টিন্ট', icon: <Droplet className="w-3 h-3"/>, val: tint, set: setTint, min: -100, max: 100, display: tint },
                        { label: 'হিউ (Hue Shift)', icon: <Palette className="w-3 h-3"/>, val: hue, set: setHue, min: -180, max: 180, display: hue }
                      ].map((filter, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-300 truncate">
                            <span className="flex items-center gap-1 truncate">{filter.icon} {filter.label}</span>
                            <span className="text-orange-400 font-mono text-[9px] min-w-[24px] text-right font-bold">
                              {filter.display > 0 ? `+${filter.display}` : filter.display}%
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min={filter.min} 
                            max={filter.max} 
                            step={(filter as any).step || 1}
                            value={filter.val} 
                            onChange={e => filter.set(Number(e.target.value))} 
                            className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:accent-orange-400 transition-all" 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 3: Details & Sharpness */}
                  {activeTab === 'detail' && (
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                      {[
                        { label: 'শার্পনেস', icon: <Focus className="w-3 h-3"/>, val: sharpness, set: setSharpness, min: 0, max: 10, display: sharpness, step: 0.1 },
                        { label: 'স্ট্রাকচার', icon: <Sliders className="w-3 h-3"/>, val: structure, set: setStructure, min: 0, max: 10, display: structure, step: 0.1 },
                        { label: 'টেক্সচার', icon: <Focus className="w-3 h-3"/>, val: texture, set: setTexture, min: 0, max: 10, display: texture, step: 0.1 },
                        { label: 'ক্ল্যারিটি', icon: <Sparkles className="w-3 h-3"/>, val: clarity, set: setClarity, min: -100, max: 100, display: clarity },
                        { label: 'ওপাসিটি', icon: <Sun className="w-3 h-3"/>, val: opacity, set: setOpacity, min: 0, max: 100, display: opacity }
                      ].map((filter, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-300 truncate">
                            <span className="flex items-center gap-1 truncate">{filter.icon} {filter.label}</span>
                            <span className="text-orange-400 font-mono text-[9px] min-w-[24px] text-right font-bold">
                              {filter.display > 0 ? `+${filter.display}` : filter.display}%
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min={filter.min} 
                            max={filter.max} 
                            step={(filter as any).step || 1}
                            value={filter.val} 
                            onChange={e => filter.set(Number(e.target.value))} 
                            className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:accent-orange-400 transition-all" 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 4: RGB Balance */}
                  {activeTab === 'rgb' && (
                    <div className="flex flex-col gap-2.5">
                      {[
                        { label: 'রেড চ্যানেল (Red)', val: redBalance, set: setRedBalance, min: -100, max: 100, color: 'accent-red-500' },
                        { label: 'গ্রীন চ্যানেল (Green)', val: greenBalance, set: setGreenBalance, min: -100, max: 100, color: 'accent-green-500' },
                        { label: 'ব্লু চ্যানেল (Blue)', val: blueBalance, set: setBlueBalance, min: -100, max: 100, color: 'accent-blue-500' }
                      ].map((rgb, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300 dark:text-gray-300">
                            <span>{rgb.label}</span>
                            <span className="text-orange-400 font-mono text-[9px] font-bold">{rgb.val > 0 ? `+${rgb.val}` : rgb.val}%</span>
                          </div>
                          <input 
                            type="range" 
                            min={rgb.min} 
                            max={rgb.max} 
                            value={rgb.val} 
                            onChange={e => rgb.set(Number(e.target.value))} 
                            className={`w-full ${rgb.color} h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer transition-all`} 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 5: Transform */}

                  {/* TAB 4: RGB Balance */}
                  {activeTab === 'rgb' && (
                    <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                      {[
                        { label: 'রেড চ্যানেল (Red)', val: redBalance, set: setRedBalance, min: -100, max: 100, color: 'accent-red-500' },
                        { label: 'গ্রীন চ্যানেল (Green)', val: greenBalance, set: setGreenBalance, min: -100, max: 100, color: 'accent-green-500' },
                        { label: 'ব্লু চ্যানেল (Blue)', val: blueBalance, set: setBlueBalance, min: -100, max: 100, color: 'accent-blue-500' }
                      ].map((rgb, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            <span>{rgb.label}</span>
                            <span className="text-orange-500 font-mono text-[9px]">{rgb.val > 0 ? `+${rgb.val}` : rgb.val}%</span>
                          </div>
                          <input 
                            type="range" 
                            min={rgb.min} 
                            max={rgb.max} 
                            value={rgb.val} 
                            onChange={e => rgb.set(Number(e.target.value))} 
                            className={`w-full ${rgb.color} h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer transition-all`} 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 5: Transform */}
                  {activeTab === 'transform' && (
                    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setTransform(prev => ({ ...prev, rotation: (prev.rotation - 90 + 360) % 360 }))}
                          className="py-2.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-orange-500 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-gray-200 dark:border-gray-700"
                        >
                          <RotateCcw className="w-4 h-4" /> ৯০° বামে
                        </button>
                        <button 
                          onClick={() => setTransform(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                          className="py-2.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-orange-500 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-gray-200 dark:border-gray-700"
                        >
                          <RotateCw className="w-4 h-4" /> ৯০° ডানে
                        </button>
                        <button 
                          onClick={() => setTransform(prev => ({ ...prev, flipH: !prev.flipH }))}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${transform.flipH ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                        >
                          <FlipHorizontal className="w-4 h-4" /> অনুভূমিক ফ্লিপ
                        </button>
                        <button 
                          onClick={() => setTransform(prev => ({ ...prev, flipV: !prev.flipV }))}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${transform.flipV ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                        >
                          <FlipVertical className="w-4 h-4" /> উল্লম্ব ফ্লিপ
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                          <span>ফ্রি রোটেশন (Free Rotate):</span>
                          <span className="text-orange-500 font-mono text-[10px]">{transform.rotation}°</span>
                        </div>
                        <input 
                          type="range" 
                          min={-180} 
                          max={180} 
                          value={transform.rotation} 
                          onChange={e => setTransform(prev => ({ ...prev, rotation: Number(e.target.value) }))} 
                          className="w-full accent-orange-500 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer transition-all" 
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 6: Protection */}
                  {activeTab === 'protection' && (
                    <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                      <button
                        onClick={() => {
                          setFaceProtection(!faceProtection);
                          showToast(!faceProtection ? 'ফেস ও স্কিন প্রটেকশন সক্রিয় হয়েছে' : 'প্রটেকশন বন্ধ করা হয়েছে');
                        }}
                        className={`w-full py-3 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${faceProtection ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/20' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-orange-500" /> ফেস ও স্কিন প্রটেকশন
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-black/10 font-bold">{faceProtection ? 'অন' : 'অফ'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setTextProtection(!textProtection);
                          showToast(!textProtection ? 'টেক্সট ও এজ প্রটেকশন সক্রিয় হয়েছে' : 'প্রটেকশন বন্ধ করা হয়েছে');
                        }}
                        className={`w-full py-3 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${textProtection ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-900/20' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500" /> টেক্সট ও এজ প্রটেকশন
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-black/10 font-bold">{textProtection ? 'অন' : 'অফ'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Format Selector & Action Buttons */}
            <div className="flex flex-col gap-3 mt-auto">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 px-1">
                <span>ডাউনলোড ফরম্যাট:</span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  {(['png', 'jpeg', 'webp'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all ${exportFormat === fmt ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                      {fmt === 'jpeg' ? 'JPG' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleDownload} className="w-full py-3.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-green-200 dark:border-green-800/50 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> ডাউনলোড ({exportFormat.toUpperCase() === 'JPEG' ? 'JPG' : exportFormat.toUpperCase()})
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
