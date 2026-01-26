import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
// Define types locally since react-easy-crop/types is not available
interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}
import './ImageEditor.css';

interface ImageEditorProps {
  imageUrl: string;
  imageName: string;
  onSave: (editedImageBlob: Blob, newName: string) => Promise<void>;
  onClose: () => void;
}

export default function ImageEditor({ imageUrl, imageName, onSave, onClose }: ImageEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // Image name
  const [name, setName] = useState(imageName);
  
  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      
      // Only set CORS if the URL is from a different origin
      const imageUrl = new URL(url, window.location.href);
      const currentOrigin = window.location.origin;
      if (imageUrl.origin !== currentOrigin) {
        image.setAttribute('crossOrigin', 'anonymous');
      }
      
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => {
        console.error('Image load error:', error, 'URL:', url);
        reject(new Error(`Failed to load image from ${url}. Please check if the image URL is correct and accessible.`));
      });
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    // Apply filters
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      blur(${blur}px)
      grayscale(${grayscale}%)
      sepia(${sepia}%)
    `;
    
    ctx.drawImage(canvas, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      setError('Please adjust the crop area');
      return;
    }

    if (!name.trim()) {
      setError('Please enter an image name');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // First, verify the image can be loaded
      try {
        await createImage(imageUrl);
      } catch (loadError: any) {
        setError(`Cannot load image: ${loadError.message || 'Image URL may be invalid or blocked by CORS'}`);
        setSaving(false);
        return;
      }

      const croppedImage = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation
      );

      await onSave(croppedImage, name.trim());
      onClose();
    } catch (err: any) {
      console.error('Error saving edited image:', err);
      setError(err.message || 'Failed to save edited image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setGrayscale(0);
    setSepia(0);
  };

  const applyPreset = (preset: string) => {
    resetFilters();
    switch (preset) {
      case 'vivid':
        setBrightness(110);
        setContrast(120);
        setSaturation(130);
        break;
      case 'bw':
        setGrayscale(100);
        setContrast(110);
        break;
      case 'vintage':
        setSepia(60);
        setContrast(90);
        setBrightness(110);
        break;
      case 'cool':
        setSaturation(80);
        setContrast(105);
        break;
      case 'warm':
        setBrightness(105);
        setSaturation(110);
        setSepia(20);
        break;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Image
          </h2>
          <button onClick={onClose} className="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ 
            padding: '12px', 
            margin: '10px', 
            backgroundColor: '#fee', 
            color: '#c33', 
            borderRadius: '4px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        <div className="editor-body">
          {/* Crop Area */}
          <div className="crop-container">
            {imageUrl && !imageUrl.includes('via.placeholder.com') ? (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={undefined}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                style={{
                  containerStyle: {
                    filter: `
                      brightness(${brightness}%)
                      contrast(${contrast}%)
                      saturate(${saturation}%)
                      blur(${blur}px)
                      grayscale(${grayscale}%)
                      sepia(${sepia}%)
                    `
                  }
                }}
              />
            ) : (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#999',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <p style={{ fontSize: '18px', marginBottom: '10px' }}>⚠️ Image Not Available</p>
                <p style={{ fontSize: '14px' }}>
                  {imageUrl?.includes('via.placeholder.com') 
                    ? 'This image appears to be a placeholder. The original image may not be accessible.'
                    : 'Unable to load image. Please check the image URL and try again.'}
                </p>
                <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                  Image URL: {imageUrl || 'Not provided'}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="controls-panel">
            {/* Image Name */}
            <div className="control-section">
              <h3>Image Name</h3>
              <div className="control-group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter image name"
                  className="name-input"
                />
              </div>
            </div>

            {/* Crop Controls */}
            <div className="control-section">
              <h3>Crop & Transform</h3>
              <div className="control-group">
                <label>Zoom: {zoom.toFixed(1)}x</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Rotate: {rotation}°</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Filter Presets */}
            <div className="control-section">
              <h3>Presets</h3>
              <div className="preset-buttons">
                <button onClick={() => applyPreset('vivid')} className="preset-btn">Vivid</button>
                <button onClick={() => applyPreset('bw')} className="preset-btn">B&W</button>
                <button onClick={() => applyPreset('vintage')} className="preset-btn">Vintage</button>
                <button onClick={() => applyPreset('cool')} className="preset-btn">Cool</button>
                <button onClick={() => applyPreset('warm')} className="preset-btn">Warm</button>
                <button onClick={resetFilters} className="preset-btn reset">Reset</button>
              </div>
            </div>

            {/* Manual Filters */}
            <div className="control-section">
              <h3>Adjust</h3>
              <div className="control-group">
                <label>Brightness: {brightness}%</label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Contrast: {contrast}%</label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Saturation: {saturation}%</label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Blur: {blur}px</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="editor-footer">
          <button onClick={onClose} className="btn-cancel" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-save" disabled={saving}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            {saving ? 'Saving...' : 'Save Edited Image'}
          </button>
        </div>
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

