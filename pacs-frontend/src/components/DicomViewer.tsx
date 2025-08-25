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
  Moon
} from 'lucide-react';

import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
import * as Hammer from 'hammerjs';
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    console.log('🔍 DicomViewer useEffect triggered, viewMode:', viewMode, 'isInitialized:', isInitialized);
    console.log('🔍 cornerstoneElementRef.current:', cornerstoneElementRef.current);
    console.log('🔍 Available modules:', {
      cornerstone: typeof cornerstone,
      cornerstoneTools: typeof cornerstoneTools,
      cornerstoneWADOImageLoader: typeof cornerstoneWADOImageLoader,
      dicomParser: typeof dicomParser
    });

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
          useWebWorkers: true,
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
        
        cornerstoneTools.init({
          mouseEnabled: true,
          touchEnabled: true,
          globalToolSyncEnabled: false,
          showSVGCursors: true
        });
        
        cornerstone.enable(cornerstoneElementRef.current);
        
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
        console.log('📊 Available tools:', cornerstoneTools.store.state.tools);
        
      } catch (err) {
        console.error('❌ Failed to initialize Cornerstone:', err);
        setError('Failed to initialize DICOM viewer');
      }
    };

    if (cornerstoneElementRef.current && !isInitialized) {
      console.log('✅ Conditions met for initialization, calling initializeCornerstone()');
      initializeCornerstone();
    } else {
      console.log('❌ Initialization conditions not met:', {
        hasElement: !!cornerstoneElementRef.current,
        isInitialized: isInitialized
      });
    }

    return () => {
      if (cornerstoneElementRef.current && isInitialized) {
        try {
          cornerstone.disable(cornerstoneElementRef.current);
        } catch (err) {
          console.error('Error disabling cornerstone:', err);
        }
      }
    };
  }, [isInitialized, viewMode]);

  useEffect(() => {
    console.log('🔍 Cornerstone element watcher - viewMode:', viewMode, 'element available:', !!cornerstoneElementRef.current);
    
    if (viewMode === '2d' && cornerstoneElementRef.current && !isInitialized) {
      console.log('✅ Cornerstone element is now available, triggering initialization...');
      
      const timer = setTimeout(() => {
        if (cornerstoneElementRef.current && !isInitialized) {
          console.log('🔄 Forcing cornerstone initialization after element became available');
          const initializeCornerstone = async () => {
            try {
              console.log('🔧 Direct Cornerstone initialization...');
              
              cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
              cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
              
              cornerstoneWADOImageLoader.configure({
                beforeSend: function(xhr: XMLHttpRequest) {
                  const token = localStorage.getItem('token');
                  if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  }
                },
                useWebWorkers: true,
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
              
              cornerstone.enable(cornerstoneElementRef.current);
              
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
              console.log('✅ Direct Cornerstone initialization successful');
              
            } catch (err) {
              console.error('❌ Direct Cornerstone initialization failed:', err);
              setError('Failed to initialize DICOM viewer');
            }
          };
          
          initializeCornerstone();
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [cornerstoneElementRef.current, viewMode, isInitialized]);

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const response = await fetch(`${API_URL}/api/studies/${studyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const studyData = await response.json();
          setStudy(studyData);
          
          if (studyData.dicom_files && studyData.dicom_files.length > 0) {
            const imageIds = studyData.dicom_files.map((file: any) => 
              `wadouri:${API_URL}/api/studies/dicom/files/${file.id}`
            );
            setImageIds(imageIds);
          } else {
            const mockImageIds = Array.from({ length: 120 }, (_, i) => 
              `example://image-${i + 1}`
            );
            setImageIds(mockImageIds);
          }
        } else {
          setError('Study not found');
        }
      } catch (err) {
        setError('Failed to load study');
      } finally {
        setLoading(false);
      }
    };

    if (studyId) {
      fetchStudy();
    }
  }, [studyId, token, API_URL]);

  useEffect(() => {
    if (isInitialized && imageIds.length > 0 && cornerstoneElementRef.current && viewMode === '2d') {
      loadImage(currentImageIndex);
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode]);

  useEffect(() => {
    if (viewMode === '3d' || viewMode === 'vr') {
      console.log('3D/VR mode selected - VTK integration coming soon');
    }
  }, [viewMode]);

  const loadImage = async (imageIndex: number) => {
    if (!cornerstoneElementRef.current || imageIndex >= imageIds.length) return;
    
    try {
      const imageId = imageIds[imageIndex];
      
      if (imageId.startsWith('wadouri:')) {
        console.log('🔄 Loading real DICOM image:', imageId);
        const image = await cornerstone.loadImage(imageId);
        console.log('✅ DICOM image loaded successfully:', image.width, 'x', image.height);
        cornerstone.displayImage(cornerstoneElementRef.current, image);
        
        const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
        cornerstone.setViewport(cornerstoneElementRef.current, {
          ...viewport,
          ...viewportSettings
        });
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        
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
        
        const mockImage = {
          imageId: imageIds[imageIndex],
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
      }
      
    } catch (err) {
      console.error('❌ Failed to load image:', err);
      console.error('Image ID that failed:', imageIds[imageIndex]);
      setError('Failed to load DICOM image');
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
    if (!imageIds.length) return;

    try {
      console.log('3D reconstruction initiated for', imageIds.length, 'slices');
      setViewMode('3d');
    } catch (error) {
      console.error('Failed to reconstruct 3D volume:', error);
    }
  };

  const generateMPR = () => {
    if (!imageIds.length) return;

    try {
      const axialView = { plane: 'axial', sliceIndex: Math.floor(imageIds.length / 2) };
      const coronalView = { plane: 'coronal', sliceIndex: Math.floor(512 / 2) };
      const sagittalView = { plane: 'sagittal', sliceIndex: Math.floor(512 / 2) };

      setMprViews({
        axial: axialView,
        coronal: coronalView,
        sagittal: sagittalView
      });

      setViewMode('mpr');
      console.log('MPR views generated:', { axialView, coronalView, sagittalView });
    } catch (error) {
      console.error('Failed to generate MPR views:', error);
    }
  };

  const generateMIP = () => {
    if (!imageIds.length) return;

    try {
      setViewMode('mip');
    } catch (error) {
      console.error('Failed to generate MIP:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSliceChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentImageIndex < imageIds.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleWindowLevelChange = (type: 'center' | 'width', value: number) => {
    const newSettings = {
      ...viewportSettings,
      [type === 'center' ? 'windowCenter' : 'windowWidth']: value
    };
    setViewportSettings(newSettings);
    
    if (cornerstoneElementRef.current) {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      cornerstone.setViewport(cornerstoneElementRef.current, {
        ...viewport,
        voi: {
          windowCenter: newSettings.windowCenter,
          windowWidth: newSettings.windowWidth
        }
      });
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => {
          if (prev >= imageIds.length - 1) {
            return 0; // Loop back to start
          }
          return prev + 1;
        });
      }, 100); // 10 FPS
      
      (window as any).cineInterval = interval;
    } else {
      if ((window as any).cineInterval) {
        clearInterval((window as any).cineInterval);
        (window as any).cineInterval = null;
      }
    }
  };

  const resetViewport = () => {
    if (cornerstoneElementRef.current) {
      cornerstone.reset(cornerstoneElementRef.current);
      setViewportSettings({
        windowCenter: 40,
        windowWidth: 400,
        zoom: 1,
        pan: { x: 0, y: 0 },
        rotation: 0,
        invert: false
      });
    }
  };

  const exportImage = (format: 'png' | 'jpg' | 'mp4' | 'stl' | 'pdf' = 'png') => {
    if (cornerstoneElementRef.current) {
      const canvas = cornerstone.getEnabledElement(cornerstoneElementRef.current).canvas;
      
      switch (format) {
        case 'png':
        case 'jpg':
          const link = document.createElement('a');
          link.download = `${study?.patient_name || 'study'}_slice_${currentImageIndex + 1}.${format}`;
          link.href = canvas.toDataURL(`image/${format}`);
          link.click();
          break;
          
        case 'mp4':
          console.log('MP4 cine export - feature coming soon');
          break;
          
        case 'stl':
          console.log('STL 3D export - feature coming soon');
          break;
          
        case 'pdf':
          console.log('PDF report export - feature coming soon');
          break;
          
        default:
          const defaultLink = document.createElement('a');
          defaultLink.download = `${study?.patient_name || 'study'}_slice_${currentImageIndex + 1}.png`;
          defaultLink.href = canvas.toDataURL();
          defaultLink.click();
      }
    }
  };

  const generateAIReport = async () => {
    if (!study) return;
    
    setAiReportLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          study_id: study.id,
          modality: study.modality,
          body_part: study.body_part
        })
      });
      
      if (response.ok) {
        const aiReport = await response.json();
        setStudy(prev => prev ? { ...prev, ai_report: aiReport } : null);
      }
    } catch (err) {
      console.error('Failed to generate AI report:', err);
    } finally {
      setAiReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-lg text-white">Loading study...</div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-lg text-red-400 mb-4">{error || 'Study not found'}</div>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">{study.patient_name}</h1>
              <p className="text-sm text-gray-300">
                {study.modality} • {study.body_part} • {study.study_date}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{study.modality}</Badge>
            <div className="flex space-x-1">
              <Button 
                variant={viewMode === '2d' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('2d')}
              >
                2D
              </Button>
              <Button 
                variant={viewMode === '3d' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => {
                  setViewMode('3d');
                  reconstruct3D();
                }}
              >
                <Move3D className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'mpr' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => {
                  setViewMode('mpr');
                  generateMPR();
                }}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'vr' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => {
                  setViewMode('vr');
                  reconstruct3D();
                }}
              >
                <Layers className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'mip' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => {
                  setViewMode('mip');
                  generateMIP();
                }}
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateAIReport}
              disabled={aiReportLoading}
            >
              {aiReportLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              AI Report
            </Button>
            <Button variant="ghost" size="sm" onClick={resetViewport}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-2">
          <Button
            variant={activeTool === 'wwwc' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('wwwc')}
            className="w-10 h-10"
            title="Window/Level"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'zoom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('zoom')}
            className="w-10 h-10"
            title="Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'pan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('pan')}
            className="w-10 h-10"
            title="Pan"
          >
            <Move3D className="w-4 h-4" />
          </Button>
          <Separator className="w-8 bg-gray-600" />
          <Button
            variant={activeTool === 'distance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('distance')}
            className="w-10 h-10"
            title="Length Measurement"
          >
            <Ruler className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'angle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('angle')}
            className="w-10 h-10"
            title="Angle Measurement"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('rectangle')}
            className="w-10 h-10"
            title="Rectangle ROI"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'ellipse' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('ellipse')}
            className="w-10 h-10"
            title="Ellipse ROI"
          >
            <Circle className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'freehand' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('freehand')}
            className="w-10 h-10"
            title="Freehand ROI"
          >
            ✏️
          </Button>
          <Button
            variant={activeTool === 'cobb' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('cobb')}
            className="w-10 h-10"
            title="Cobb Angle"
          >
            📐
          </Button>
          <Separator className="w-8 bg-gray-600" />
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="w-10 h-10"
            title="Cine Playback"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportImage('png')}
              className="w-10 h-10"
              title="Export Options"
            >
              <Download className="w-4 h-4" />
            </Button>
            <div className="absolute left-12 top-0 hidden group-hover:block bg-gray-700 rounded-md shadow-lg p-2 space-y-1 z-10">
              <Button size="sm" variant="ghost" onClick={() => exportImage('png')} className="w-full justify-start text-xs">
                PNG Image
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('jpg')} className="w-full justify-start text-xs">
                JPEG Image
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('mp4')} className="w-full justify-start text-xs">
                MP4 Cine
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('stl')} className="w-full justify-start text-xs">
                STL 3D Model
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('pdf')} className="w-full justify-start text-xs">
                PDF Report
              </Button>
            </div>
          </div>
        </div>

        {/* Main Viewer */}
        <div className="flex-1 flex">
          <div className="flex-1 bg-black relative">
            <div 
              ref={viewerRef}
              className="w-full h-full flex items-center justify-center"
            >
              {/* 2D Cornerstone DICOM Viewer */}
              {viewMode === '2d' && (
                <div 
                  ref={cornerstoneElementRef}
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
              
              {/* 3D VTK Viewer */}
              {(viewMode === '3d' || viewMode === 'vr') && (
                <div 
                  ref={vtkContainerRef}
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                />
              )}
              
              {/* MPR Views */}
              {viewMode === 'mpr' && (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1">
                  <div className="bg-gray-900 flex items-center justify-center text-white">
                    <div>Axial View {mprViews.axial ? '✓' : '○'}</div>
                  </div>
                  <div className="bg-gray-900 flex items-center justify-center text-white">
                    <div>Coronal View {mprViews.coronal ? '✓' : '○'}</div>
                  </div>
                  <div className="bg-gray-900 flex items-center justify-center text-white">
                    <div>Sagittal View {mprViews.sagittal ? '✓' : '○'}</div>
                  </div>
                  <div className="bg-gray-900 flex items-center justify-center text-white">
                    <div>3D Reconstruction</div>
                  </div>
                </div>
              )}
              
              {/* MIP View */}
              {viewMode === 'mip' && (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
                  <div>Maximum Intensity Projection</div>
                </div>
              )}
            </div>
            
            {/* Overlay Info */}
            <div className="absolute top-4 left-4 text-sm bg-black bg-opacity-50 p-2 rounded">
              <div>Patient: {study.patient_name}</div>
              <div>ID: {study.patient_id}</div>
              <div>W/L: {viewportSettings.windowWidth}/{viewportSettings.windowCenter}</div>
              <div>Zoom: {(viewportSettings.zoom * 100).toFixed(0)}%</div>
            </div>
            
            <div className="absolute top-4 right-4 text-sm text-right bg-black bg-opacity-50 p-2 rounded">
              <div>{study.modality}</div>
              <div>{study.body_part}</div>
              <div>Image: {currentImageIndex + 1}/{imageIds.length}</div>
            </div>

            {/* Slice Navigation */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSliceChange('prev')}
                disabled={currentImageIndex === 0}
              >
                Previous
              </Button>
              <span className="text-sm px-2">
                {currentImageIndex + 1} / {imageIds.length}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSliceChange('next')}
                disabled={currentImageIndex === imageIds.length - 1}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Window/Level Controls */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Window/Level</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-300">Window Width: {viewportSettings.windowWidth}</label>
                    <Slider
                      value={[viewportSettings.windowWidth]}
                      onValueChange={(value) => handleWindowLevelChange('width', value[0])}
                      max={2000}
                      min={1}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-300">Window Center: {viewportSettings.windowCenter}</label>
                    <Slider
                      value={[viewportSettings.windowCenter]}
                      onValueChange={(value) => handleWindowLevelChange('center', value[0])}
                      max={1000}
                      min={-1000}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        handleWindowLevelChange('width', 400);
                        handleWindowLevelChange('center', 40);
                      }}
                    >
                      Soft Tissue
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        handleWindowLevelChange('width', 1500);
                        handleWindowLevelChange('center', 300);
                      }}
                    >
                      Bone
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        handleWindowLevelChange('width', 1600);
                        handleWindowLevelChange('center', -600);
                      }}
                    >
                      Lung
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Study Info */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Study Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><span className="text-gray-300">Patient:</span> {study.patient_name}</div>
                  <div><span className="text-gray-300">ID:</span> {study.patient_id}</div>
                  <div><span className="text-gray-300">Date:</span> {study.study_date}</div>
                  <div><span className="text-gray-300">Modality:</span> {study.modality}</div>
                  <div><span className="text-gray-300">Body Part:</span> {study.body_part}</div>
                  <div><span className="text-gray-300">Description:</span> {study.study_description}</div>
                  <div><span className="text-gray-300">Images:</span> {imageIds.length}</div>
                </CardContent>
              </Card>

              {/* Measurements */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Measurements</CardTitle>
                </CardHeader>
                <CardContent>
                  {measurements.length === 0 ? (
                    <p className="text-sm text-gray-400">Use measurement tools to add annotations</p>
                  ) : (
                    <div className="space-y-2">
                      {measurements.map((measurement) => (
                        <div key={measurement.id} className="text-sm">
                          <div className="flex justify-between">
                            <span className="capitalize">{measurement.type}</span>
                            <span>{measurement.value.toFixed(1)} {measurement.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Report */}
              {study.ai_report && (
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      AI Analysis
                      {study.ai_report.ai_model && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {study.ai_report.ai_model}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Findings:</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {study.ai_report.findings.map((finding, index) => (
                          <li key={index} className="text-xs">• {finding}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Impression:</h4>
                      <p className="text-sm text-gray-300">{study.ai_report.impression}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Confidence:</h4>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${study.ai_report.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-300">
                          {(study.ai_report.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Pathology Scores */}
                    {study.ai_report.pathology_scores && (
                      <div>
                        <h4 className="text-sm font-medium text-white mb-1">Pathology Scores:</h4>
                        <div className="space-y-1">
                          {Object.entries(study.ai_report.pathology_scores)
                            .filter(([_, score]) => score > 0.1)
                            .sort(([_, a], [__, b]) => b - a)
                            .slice(0, 5)
                            .map(([pathology, score]) => (
                            <div key={pathology} className="flex justify-between text-xs">
                              <span className="text-gray-300">{pathology.replace('_', ' ')}</span>
                              <span className="text-white">{(score * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
