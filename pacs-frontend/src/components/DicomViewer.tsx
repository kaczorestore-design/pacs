import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { 
  ArrowLeft, 
  ZoomIn, 
  RotateCw, 
  Ruler, 
  Square, 
  Circle,
  Play,
  Pause,
  Download,
  Settings,
  Brain,
  Activity,
  Grid3X3,
  Eye,
  Move3D,
  RefreshCw,
  Layers,
  Maximize,
  Sun,
  Moon,
  Network,
} from 'lucide-react';
import { DICOMNetworkPanel } from './DICOMNetworkPanel';
import { DICOMProtocolTester } from './DICOMProtocolTester';

import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
import Hammer from 'hammerjs';
import * as cornerstoneMath from 'cornerstone-math';


interface Study {
  id: number;
  patient_name: string;
  patient_id: string;
  study_date: string;
  modality: string;
  body_part: string;
  study_description: string;
  ai_report?: {
    findings: string[];
    impression: string;
    confidence: number;
    pathology_scores?: Record<string, number>;
    abnormal_findings?: string[];
    ai_model?: string;
    analysis_type?: string;
  };
  dicom_files?: Array<{
    id: number;
    file_path: string;
    instance_number: number;
    slice_location?: number;
  }>;
}

interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'ellipse' | 'rectangle';
  value: number;
  unit: string;
  coordinates: number[];
  label?: string;
}

interface ViewportSettings {
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  invert: boolean;
}

export default function DicomViewer() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const viewerRef = useRef<HTMLDivElement>(null);
  const cornerstoneElementRef = useRef<HTMLDivElement>(null);
  const vtkContainerRef = useRef<HTMLDivElement>(null);
  
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurements] = useState<Measurement[]>([]);
  const [activeTool, setActiveTool] = useState<string>('wwwc');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    windowCenter: 40,
    windowWidth: 400,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    invert: false
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'mpr' | 'vr' | 'mip'>('2d');
  const [mprViews, setMprViews] = useState<{axial: any, coronal: any, sagittal: any}>({
    axial: null, 
    coronal: null, 
    sagittal: null
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [showDICOMNetworking, setShowDICOMNetworking] = useState(false);
  const [showAIHeatmap, setShowAIHeatmap] = useState(false);
  const [seriesSynchronization, setSeriesSynchronization] = useState(false);
  const [hangingProtocol, setHangingProtocol] = useState<string>('default');
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  const [dicomwebService, setDicomwebService] = useState<any>(null);
  
  const persistedMeasurements = measurements;
  const measurementsLoading = false;
  const saveMeasurement = (measurement: any) => {
    console.log('Saving measurement:', measurement);
  };
  const deleteMeasurement = (id: string) => {
    console.log('Deleting measurement:', id);
  };

  useEffect(() => {
    console.log('🔍 DicomViewer useEffect triggered, viewMode:', viewMode, 'isInitialized:', isInitialized);
    console.log('🔍 cornerstoneElementRef.current:', cornerstoneElementRef.current);
    
    if (!cornerstoneElementRef.current || isInitialized) {
      console.log('⏳ Waiting for cornerstone element to be ready or already initialized');
      return;
    }
    
    const timer = setTimeout(() => {
      initializeCornerstone();
    }, 100);
    
    return () => clearTimeout(timer);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cornerstoneElementRef.current, isInitialized]);
  
  const initializeCornerstone = async () => {
    try {
      if (!cornerstoneElementRef.current) {
        console.log('❌ cornerstoneElementRef.current is null, skipping initialization');
        return;
      }

        console.log('🔧 Initializing Cornerstone.js...');
        
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        
        cornerstoneWADOImageLoader.configure({
          beforeSend: function(xhr: XMLHttpRequest) {
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          },
          useWebWorkers: false,
          webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.js',
          taskConfiguration: {
            'decodeTask': {
              loadCodecsOnStartup: true,
              initializeCodecsOnStartup: false,
              codecsPath: '/cornerstoneWADOImageLoaderCodecs.js',
              usePDFJS: false,
              strict: false
            }
          }
        });

        cornerstoneTools.external.cornerstone = cornerstone;
        cornerstoneTools.external.Hammer = Hammer;
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
        
        cornerstoneTools.init({
          mouseEnabled: true,
          touchEnabled: true,
          globalToolSyncEnabled: false,
          showSVGCursors: true
        });
        
        try {
          cornerstone.enable(cornerstoneElementRef.current);
          console.log('✅ Cornerstone element enabled successfully');
        } catch (enableErr) {
          console.error('❌ Failed to enable cornerstone element:', enableErr);
          setError('Failed to initialize DICOM viewer element');
          return;
        }
        
        const LengthTool = cornerstoneTools.LengthTool;
        const AngleTool = cornerstoneTools.AngleTool;
        const RectangleRoiTool = cornerstoneTools.RectangleRoiTool;
        const EllipticalRoiTool = cornerstoneTools.EllipticalRoiTool;
        const WwwcTool = cornerstoneTools.WwwcTool;
        const PanTool = cornerstoneTools.PanTool;
        const ZoomTool = cornerstoneTools.ZoomTool;
        const StackScrollMouseWheelTool = cornerstoneTools.StackScrollMouseWheelTool;
        
        cornerstoneTools.addTool(LengthTool);
        cornerstoneTools.addTool(AngleTool);
        cornerstoneTools.addTool(RectangleRoiTool);
        cornerstoneTools.addTool(EllipticalRoiTool);
        cornerstoneTools.addTool(WwwcTool);
        cornerstoneTools.addTool(PanTool);
        cornerstoneTools.addTool(ZoomTool);
        cornerstoneTools.addTool(StackScrollMouseWheelTool);
        
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 });
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
        cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
        
        (window as any).cornerstone = cornerstone;
        (window as any).cornerstoneTools = cornerstoneTools;
        (window as any).cornerstoneWADOImageLoader = cornerstoneWADOImageLoader;
        
        setIsInitialized(true);
        console.log('✅ Cornerstone initialized successfully');
        
      } catch (err) {
        console.error('❌ Failed to initialize Cornerstone:', err);
        setError('Failed to initialize DICOM viewer');
      }
    };

  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 0 && viewMode === '2d') {
      loadImage(currentImageIndex);
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode]);

  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 0 && viewMode === '2d') {
      console.log('✅ Cornerstone initialized, loading images:', imageIds);
      loadImage(0);
    }
  }, [isInitialized, imageIds, viewMode]);

  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 0 && cornerstoneElementRef.current && viewMode === '2d') {
      loadImage(currentImageIndex);
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode]);

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching study with ID: ${studyId}`);
        const response = await fetch(`${API_URL}/api/studies/${studyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const studyData = await response.json();
          setStudy(studyData);
          
          if (studyData.dicom_files && studyData.dicom_files.length > 0) {
            const ids = studyData.dicom_files.map((file: any) => 
              `wadouri:${API_URL}/api/studies/dicom/files/${file.id}`
            );
            setImageIds(ids);
            console.log('✅ Study loaded with image IDs:', ids);
          } else {
            const mockIds = Array.from({ length: 120 }, (_, i) => 
              `example://image-${i + 1}`
            );
            setImageIds(mockIds);
            console.log('⚠️ No DICOM files found, using mock images');
          }
        } else {
          setError('Study not found or access denied');
          console.error('Failed to fetch study:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error fetching study:', err);
        setError('Failed to load study data');
      } finally {
        setLoading(false);
      }
    };

    if (studyId) {
      fetchStudy();
    }
  }, [studyId, token, API_URL]);

  useEffect(() => {
    if (viewMode === '3d' || viewMode === 'vr') {
      console.log('3D/VR mode selected - VTK integration coming soon');
    }
  }, [viewMode]);

  const loadImage = async (imageIndex: number) => {
    if (!cornerstoneElementRef.current) {
      console.error('Cannot load image - cornerstone element not available');
      setError('Viewer element not ready. Please try refreshing the page.');
      return;
    }
    
    if (!isInitialized) {
      console.error('Cannot load image - cornerstone not initialized');
      setError('DICOM viewer not initialized. Please try refreshing the page.');
      return;
    }
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      console.error('No image IDs available or not an array');
      setError('No images available for this study');
      return;
    }
    
    if (imageIndex < 0 || imageIndex >= imageIds.length) {
      console.error('Invalid image index:', imageIndex, 'max:', imageIds.length - 1);
      return;
    }
    
    try {
      const imageId = imageIds[imageIndex];
      
      if (imageId && typeof imageId === 'string' && imageId.startsWith('wadouri:')) {
        console.log('🔄 Loading real DICOM image:', imageId);
        try {
          const image = await cornerstone.loadImage(imageId);
          console.log('✅ DICOM image loaded successfully:', image.width, 'x', image.height);
          
          if (cornerstoneElementRef.current) {
            cornerstone.displayImage(cornerstoneElementRef.current, image);
            
            const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
            cornerstone.setViewport(cornerstoneElementRef.current, {
              ...viewport,
              ...viewportSettings
            });
          } else {
            console.error('Cornerstone element reference lost during image loading');
          }
        } catch (err) {
          console.error('Failed to load DICOM image:', err);
          createAndDisplayMockImage(imageIndex);
        }
      } else {
        createAndDisplayMockImage(imageIndex);
      }
      
    } catch (err) {
      console.error('❌ Failed to load image:', err);
      if (imageIds && imageIndex < imageIds.length) {
        console.error('Image ID that failed:', imageIds[imageIndex]);
      }
      setError('Failed to load DICOM image');
    }
  };

  const createAndDisplayMockImage = (imageIndex: number) => {
    if (!cornerstoneElementRef.current) {
      console.error('Cannot create mock image - cornerstone element not available');
      return;
    }
    
    if (!isInitialized) {
      console.error('Cannot create mock image - cornerstone not initialized');
      return;
    }
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get 2D context from canvas');
        return;
      }
      
      const imageData = ctx.createImageData(512, 512);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const x = (i / 4) % 512;
        const y = Math.floor((i / 4) / 512);
        const centerX = 256;
        const centerY = 256;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        let intensity = 0;
        if (study?.modality === 'CR' || study?.modality === 'DX') {
          intensity = Math.max(0, 200 - distance * 0.5 + Math.sin(x * 0.02) * 20 + Math.cos(y * 0.02) * 20);
          if (distance > 200) intensity = Math.max(intensity * 0.3, 20);
        } else if (study?.modality === 'CT') {
          intensity = 128 + Math.sin(distance * 0.02) * 50 + Math.random() * 30;
        } else if (study?.modality === 'MR') {
          intensity = 150 + Math.cos(distance * 0.01) * 80 + Math.sin(x * 0.01) * 30;
        } else {
          intensity = Math.max(0, 255 - distance + Math.random() * 50);
        }
        
        intensity = Math.max(0, Math.min(255, intensity));
        
        imageData.data[i] = intensity;
        imageData.data[i + 1] = intensity;
        imageData.data[i + 2] = intensity;
        imageData.data[i + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const mockImageId = imageIds && imageIndex < imageIds.length ? 
        imageIds[imageIndex] : `mock-image-${imageIndex}`;
      
      const mockImage = {
        imageId: mockImageId,
        minPixelValue: 0,
        maxPixelValue: 255,
        slope: 1,
        intercept: 0,
        windowCenter: viewportSettings.windowCenter,
        windowWidth: viewportSettings.windowWidth,
        render: cornerstone.renderGrayscaleImage,
        getPixelData: () => imageData.data,
        rows: 512,
        columns: 512,
        height: 512,
        width: 512,
        color: false,
        columnPixelSpacing: 1,
        rowPixelSpacing: 1,
        invert: false,
        sizeInBytes: 512 * 512
      };
      
      cornerstone.displayImage(cornerstoneElementRef.current, mockImage);
      
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      cornerstone.setViewport(cornerstoneElementRef.current, {
        ...viewport,
        ...viewportSettings
      });
      
      console.log('✅ Mock image displayed successfully');
    } catch (err) {
      console.error('❌ Failed to create and display mock image:', err);
    }
  };

  const handleToolSelect = (tool: string) => {
    if (!cornerstoneElementRef.current) return;
    
    cornerstoneTools.setToolPassive('Length');
    cornerstoneTools.setToolPassive('Angle');
    cornerstoneTools.setToolPassive('RectangleRoi');
    cornerstoneTools.setToolPassive('EllipticalRoi');
    cornerstoneTools.setToolPassive('FreehandRoi');
    cornerstoneTools.setToolPassive('CobbAngle');
    cornerstoneTools.setToolPassive('Wwwc');
    cornerstoneTools.setToolPassive('Pan');
    cornerstoneTools.setToolPassive('Zoom');
    
    switch (tool) {
      case 'distance':
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'angle':
        cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
        break;
      case 'rectangle':
        cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
        break;
      case 'ellipse':
        cornerstoneTools.setToolActive('EllipticalRoi', { mouseButtonMask: 1 });
        break;
      case 'freehand':
        cornerstoneTools.setToolActive('FreehandRoi', { mouseButtonMask: 1 });
        break;
      case 'cobb':
        cornerstoneTools.setToolActive('CobbAngle', { mouseButtonMask: 1 });
        break;
      case 'wwwc':
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'pan':
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
        break;
      case 'zoom':
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
        break;
      default:
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
    }
    
    setActiveTool(tool);
  };

  const reconstruct3D = () => {
    setViewMode('3d');
    console.log('3D reconstruction requested - VTK integration coming soon');
  };

  const generateMPR = () => {
    setViewMode('mpr');
    
    setMprViews({
      axial: { label: 'Axial View', ready: true },
      coronal: { label: 'Coronal View', ready: true },
      sagittal: { label: 'Sagittal View', ready: true }
    });
    
    console.log('MPR generation requested - VTK integration coming soon');
  };

  const generateMIP = () => {
    setViewMode('mip');
    console.log('MIP generation requested - VTK integration coming soon');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSliceChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < imageIds.length) {
      setCurrentImageIndex(newIndex);
    }
  };

  const handleWindowLevelChange = (type: 'center' | 'width', value: number) => {
    const newSettings = {
      ...viewportSettings,
      windowCenter: type === 'center' ? value : viewportSettings.windowCenter,
      windowWidth: type === 'width' ? value : viewportSettings.windowWidth
    };
    
    setViewportSettings(newSettings);
    
    if (cornerstoneElementRef.current && isInitialized) {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      viewport.voi.windowWidth = newSettings.windowWidth;
      viewport.voi.windowCenter = newSettings.windowCenter;
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => {
        const next = prev + 1;
        if (next >= imageIds.length) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    
    return () => clearInterval(interval);
  };

  const resetViewport = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    const defaultSettings = {
      windowCenter: 40,
      windowWidth: 400,
      zoom: 1,
      pan: { x: 0, y: 0 },
      rotation: 0,
      invert: false
    };
    
    setViewportSettings(defaultSettings);
    cornerstone.reset(cornerstoneElementRef.current);
  };

  const exportImage = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    try {
      const element = cornerstoneElementRef.current;
      const viewport = cornerstone.getViewport(element);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('Failed to get canvas context');
        return;
      }
      
      const image = cornerstone.getImage(element);
      
      canvas.width = image.width;
      canvas.height = image.height;
      
      cornerstone.drawImage(context, element, viewport);
      
      const link = document.createElement('a');
      link.download = `study_${studyId}_image_${currentImageIndex}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
    } catch (err) {
      console.error('Failed to export image:', err);
    }
  };

  const generateAIReport = async () => {
    if (!study) return;
    
    try {
      setAiReportLoading(true);
      
      const response = await fetch(`${API_URL}/api/studies/${studyId}/ai-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modality: study.modality,
          body_part: study.body_part
        })
      });
      
      if (response.ok) {
        const reportData = await response.json();
        
        setStudy(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ai_report: reportData
          };
        });
        
        setShowAIHeatmap(true);
      } else {
        console.error('Failed to generate AI report:', response.status);
      }
    } catch (err) {
      console.error('Error generating AI report:', err);
    } finally {
      setAiReportLoading(false);
    }
  };

  const exportCineLoop = () => {
    if (!cornerstoneElementRef.current || !isInitialized || imageIds.length < 2) {
      console.error('Cannot export cine loop - viewer not ready or not enough images');
      return;
    }
    
    try {
      console.log('Exporting cine loop...');
      
      
      alert('Cine loop export feature coming soon. This would export a MP4 video of the current series.');
      
    } catch (err) {
      console.error('Failed to export cine loop:', err);
    }
  };

  const export3DModel = async () => {
    if (!study) return;
    
    try {
      console.log('Exporting 3D model...');
      
      
      const stlContent = `solid DICOM_3D_Model
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid DICOM_3D_Model`;
      
      const blob = new Blob([stlContent], { type: 'model/stl' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `study_${studyId}_3d_model.stl`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Failed to export 3D model:', err);
    }
  };

  const exportReportPDF = async () => {
    if (!study) return;
    
    try {
      const response = await fetch(`${API_URL}/api/studies/${studyId}/report/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `study_${studyId}_report.pdf`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download report PDF:', response.status);
      }
    } catch (err) {
      console.error('Error downloading report PDF:', err);
    }
  };

  const initializeDICOMweb = () => {
    setShowDICOMNetworking(true);
  };

  const toggleSeriesSynchronization = () => {
    setSeriesSynchronization(!seriesSynchronization);
    console.log(`Series synchronization ${!seriesSynchronization ? 'enabled' : 'disabled'}`);
  };

  const applyHangingProtocol = (protocol: string) => {
    setHangingProtocol(protocol);
    console.log(`Applied hanging protocol: ${protocol}`);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!keyboardShortcuts) return;
      
      switch (e.key) {
        case 'ArrowRight':
          setCurrentImageIndex(prev => Math.min(prev + 1, imageIds.length - 1));
          break;
        case 'ArrowLeft':
          setCurrentImageIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'w':
          handleToolSelect('wwwc');
          break;
        case 'p':
          handleToolSelect('pan');
          break;
        case 'z':
          handleToolSelect('zoom');
          break;
        case 'd':
          handleToolSelect('distance');
          break;
        case 'a':
          handleToolSelect('angle');
          break;
        case 'r':
          handleToolSelect('rectangle');
          break;
        case 'e':
          handleToolSelect('ellipse');
          break;
        case 'f':
          handleToolSelect('freehand');
          break;
        case 'c':
          handleToolSelect('cobb');
          break;
        case 'Space':
          togglePlayback();
          break;
        case 'Escape':
          resetViewport();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [keyboardShortcuts, imageIds.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-2xl w-full mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <Button onClick={() => navigate(-1)} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Studies
        </Button>
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl w-full">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting Tips:</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Check your network connection</li>
            <li>Verify that the study ID is correct</li>
            <li>Ensure you have permission to access this study</li>
            <li>Try refreshing the page</li>
            <li>Contact support if the issue persists</li>
          </ul>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-500 hover:bg-blue-600"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">{study?.patient_name || 'Unknown Patient'}</h1>
              <div className="flex space-x-2 text-sm">
                <span>ID: {study?.patient_id || 'Unknown'}</span>
                <span>•</span>
                <span>Date: {study?.study_date || 'Unknown'}</span>
                <span>•</span>
                <Badge variant="outline">{study?.modality || 'Unknown'}</Badge>
                <Badge variant="outline">{study?.body_part || 'Unknown'}</Badge>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={initializeDICOMweb}
            >
              <Network className="h-4 w-4 mr-2" />
              DICOM Network
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportReportPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Toolbar */}
        <div className={`w-full md:w-16 p-2 flex md:flex-col justify-center items-center space-y-0 md:space-y-2 space-x-2 md:space-x-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <Button 
            variant={activeTool === 'wwwc' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('wwwc')}
            className="aspect-square"
            title="Window/Level (W)"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant={activeTool === 'zoom' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('zoom')}
            className="aspect-square"
            title="Zoom (Z)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant={activeTool === 'pan' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('pan')}
            className="aspect-square"
            title="Pan (P)"
          >
            <Move3D className="h-4 w-4" />
          </Button>
          <Button 
            variant={activeTool === 'distance' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('distance')}
            className="aspect-square"
            title="Distance Measurement (D)"
          >
            <Ruler className="h-4 w-4" />
          </Button>
          <Button 
            variant={activeTool === 'angle' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('angle')}
            className="aspect-square"
            title="Angle Measurement (A)"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button 
            variant={activeTool === 'rectangle' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('rectangle')}
            className="aspect-square"
            title="Rectangle ROI (R)"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button 
            variant={activeTool === 'ellipse' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('ellipse')}
            className="aspect-square"
            title="Elliptical ROI (E)"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Separator className="my-2" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={togglePlayback}
            className="aspect-square"
            title="Play/Pause Cine (Space)"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetViewport}
            className="aspect-square"
            title="Reset Viewport (Esc)"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportImage}
            className="aspect-square"
            title="Export Image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Viewer */}
        <div className="flex-1 flex flex-col">
          {/* View Mode Tabs */}
          <div className={`flex space-x-2 p-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <Button 
              variant={viewMode === '2d' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('2d')}
            >
              2D
            </Button>
            <Button 
              variant={viewMode === 'mpr' ? 'default' : 'outline'} 
              size="sm" 
              onClick={generateMPR}
            >
              MPR
            </Button>
            <Button 
              variant={viewMode === '3d' ? 'default' : 'outline'} 
              size="sm" 
              onClick={reconstruct3D}
            >
              3D
            </Button>
            <Button 
              variant={viewMode === 'vr' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('vr')}
            >
              VR
            </Button>
            <Button 
              variant={viewMode === 'mip' ? 'default' : 'outline'} 
              size="sm" 
              onClick={generateMIP}
            >
              MIP
            </Button>
          </div>

          {/* Viewer Container */}
          <div className="flex-1 relative" ref={viewerRef}>
            <div 
                ref={cornerstoneElementRef}
                className={`w-full h-full bg-black ${viewMode !== '2d' ? 'hidden' : ''}`}
                style={{ minHeight: '500px' }}
              ></div>
            
            {viewMode === 'mpr' && (
              <div className="grid grid-cols-2 gap-2 h-full">
                <div className="bg-black flex items-center justify-center">
                  <div>Axial View</div>
                </div>
                <div className="bg-black flex items-center justify-center">
                  <div>Coronal View</div>
                </div>
                <div className="bg-black flex items-center justify-center">
                  <div>Sagittal View</div>
                </div>
                <div className="bg-black flex items-center justify-center">
                  <div>3D View</div>
                </div>
              </div>
            )}
            
            {(viewMode === '3d' || viewMode === 'vr' || viewMode === 'mip') && (
              <div 
                ref={vtkContainerRef}
                className="w-full h-full bg-black flex items-center justify-center"
                style={{ minHeight: '500px' }}
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">{viewMode.toUpperCase()} Rendering</h3>
                  <p>Advanced visualization coming soon</p>
                  <p className="text-sm text-gray-400 mt-4">This feature requires VTK.js integration</p>
                </div>
              </div>
            )}
            
            {/* Image Controls */}
            {viewMode === '2d' && (
              <div className={`absolute bottom-0 left-0 right-0 p-4 ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSliceChange(currentImageIndex - 1)}
                      disabled={currentImageIndex <= 0}
                    >
                      Previous
                    </Button>
                    <div>
                      Image {currentImageIndex + 1} / {imageIds.length}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSliceChange(currentImageIndex + 1)}
                      disabled={currentImageIndex >= imageIds.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="text-sm">Window Width: {viewportSettings.windowWidth}</div>
                      <Slider 
                        value={[viewportSettings.windowWidth]} 
                        min={1} 
                        max={2000} 
                        step={1}
                        onValueChange={(value) => handleWindowLevelChange('width', value[0])}
                        className="w-32"
                      />
                    </div>
                    <div>
                      <div className="text-sm">Window Center: {viewportSettings.windowCenter}</div>
                      <Slider 
                        value={[viewportSettings.windowCenter]} 
                        min={-1000} 
                        max={1000} 
                        step={1}
                        onValueChange={(value) => handleWindowLevelChange('center', value[0])}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Report & Measurements */}
        <div className={`w-full md:w-80 p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
          {/* AI Report */}
          <Card className={`mb-4 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'}`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>AI Analysis</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateAIReport}
                  disabled={aiReportLoading}
                >
                  {aiReportLoading ? 'Analyzing...' : 'Generate'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {study?.ai_report ? (
                <div>
                  <div className="mb-2">
                    <Badge variant="outline" className="mb-2">
                      {study.ai_report.analysis_type || 'General Analysis'}
                    </Badge>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Confidence: {study.ai_report.confidence * 100}%
                    </div>
                  </div>
                  
                  <h4 className="font-semibold mt-4">Findings:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {study.ai_report.findings.map((finding, i) => (
                      <li key={i}>{finding}</li>
                    ))}
                  </ul>
                  
                  <h4 className="font-semibold mt-4">Impression:</h4>
                  <p className="text-sm">{study.ai_report.impression}</p>
                  
                  {study.ai_report.pathology_scores && (
                    <>
                      <h4 className="font-semibold mt-4">Pathology Scores:</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(study.ai_report.pathology_scores).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span>{(value * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No AI analysis available. Click "Generate" to analyze this study.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Measurements */}
          <Card className={`mb-4 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'}`}>
            <CardHeader>
              <CardTitle>Measurements</CardTitle>
            </CardHeader>
            <CardContent>
              {measurementsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : persistedMeasurements.length > 0 ? (
                <div className="space-y-2">
                  {persistedMeasurements.map((measurement) => (
                    <div key={measurement.id} className="flex justify-between items-center p-2 rounded bg-gray-100 dark:bg-gray-600">
                      <div>
                        <div className="font-medium">{measurement.type}</div>
                        <div className="text-sm">{measurement.value} {measurement.unit}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMeasurement(measurement.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No measurements yet. Use the measurement tools to add some.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Advanced Tools */}
          <Card className={`${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white'}`}>
            <CardHeader>
              <CardTitle>Advanced Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={exportCineLoop}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Cine Loop
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={export3DModel}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Export 3D Model
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={toggleSeriesSynchronization}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {seriesSynchronization ? 'Disable' : 'Enable'} Series Sync
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => applyHangingProtocol('chest')}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Apply Hanging Protocol
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* DICOM Networking Panel */}
      {showDICOMNetworking && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
          <div className={`w-full max-w-4xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">DICOM Networking</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDICOMNetworking(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              <DICOMNetworkPanel />
              <DICOMProtocolTester />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
