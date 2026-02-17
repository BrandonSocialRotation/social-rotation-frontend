import { useState, useRef, useEffect, useMemo } from 'react';
import './ImageEditor.css';

interface ImageEditorProps {
  imageUrl: string;
  imageName: string;
  onSave: (editedImageBlob: Blob, newName: string) => Promise<void>;
  onClose: () => void;
  watermarkLogoUrl?: string | null;
}

export default function ImageEditor({ imageUrl, imageName, onSave, onClose, watermarkLogoUrl }: ImageEditorProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageUrlState, setImageUrlState] = useState<string | null>(null);
  
  // Image name
  const [name, setName] = useState(imageName);
  
  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  
  // Watermark states
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [watermarkScale, setWatermarkScale] = useState(20); // Percentage of image size
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const [watermarkKey, setWatermarkKey] = useState(0); // Force re-render when position changes
  const [watermarkLoaded, setWatermarkLoaded] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load watermark logo if available
  const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null);
  
  // Calculate stable display size based only on image dimensions (not watermark state)
  const displaySize = useMemo(() => {
    if (!imageDimensions) return { width: 800, height: 600 };
    
    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;
    const maxDisplayWidth = containerWidth - 40;
    const maxDisplayHeight = containerHeight - 40;
    const minDisplaySize = 400;
    
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = maxDisplayWidth / maxDisplayHeight;
    
    let displayWidth: number;
    let displayHeight: number;
    
    if (imageAspectRatio > containerAspectRatio) {
      displayWidth = Math.max(minDisplaySize, Math.min(maxDisplayWidth, imageDimensions.width));
      displayHeight = displayWidth / imageAspectRatio;
      if (displayHeight > maxDisplayHeight) {
        displayHeight = maxDisplayHeight;
        displayWidth = displayHeight * imageAspectRatio;
      }
    } else {
      displayHeight = Math.max(minDisplaySize, Math.min(maxDisplayHeight, imageDimensions.height));
      displayWidth = displayHeight * imageAspectRatio;
      if (displayWidth > maxDisplayWidth) {
        displayWidth = maxDisplayWidth;
        displayHeight = displayWidth / imageAspectRatio;
      }
    }
    
    return { width: displayWidth, height: displayHeight };
  }, [imageDimensions?.width, imageDimensions?.height]);
  
  useEffect(() => {
    if (watermarkLogoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setWatermarkLoaded(true);
        setWatermarkImg(img);
        // Don't auto-enable watermark - keep it off by default
      };
      img.onerror = () => {
        console.error('Failed to load watermark logo:', watermarkLogoUrl);
        setWatermarkLoaded(false);
        setWatermarkImg(null);
      };
      img.src = watermarkLogoUrl;
    } else {
      setWatermarkLoaded(false);
      setWatermarkImg(null);
    }
  }, [watermarkLogoUrl]);
  
  // Load image when component mounts
  useEffect(() => {
    const loadImage = async () => {
      try {
        setImageLoaded(false);
        setImageDimensions(null);
        setError('');
        
        console.log('[ImageEditor] Loading image:', imageUrl);
        
        if (!imageUrl) {
          setError('No image URL provided');
          return;
        }
        
        const img = await createImage(imageUrl);
        console.log('[ImageEditor] Image loaded, dimensions:', img.naturalWidth, 'x', img.naturalHeight);
        
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setImageLoaded(true);
          setImageUrlState(imageUrl);
        } else {
          setError('Image has invalid dimensions');
        }
      } catch (err: any) {
        console.error('[ImageEditor] Failed to load image:', err, 'URL:', imageUrl);
        setError(err.message || `Failed to load image from: ${imageUrl}`);
        setImageLoaded(false);
        setImageDimensions(null);
      }
    };
    
    if (imageUrl && !imageUrl.includes('via.placeholder.com')) {
      loadImage();
    } else {
      setImageLoaded(true);
      setImageDimensions({ width: 800, height: 600 });
      setImageUrlState(imageUrl);
    }
  }, [imageUrl]);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      
      // Set CORS for cross-origin images
      const imageUrlObj = new URL(url, window.location.href);
      const currentOrigin = window.location.origin;
      
      if (imageUrlObj.origin !== currentOrigin || url.includes('/api/v1/images/proxy')) {
        image.setAttribute('crossOrigin', 'anonymous');
      }
      
      image.addEventListener('load', () => {
        if (image.width === 0 || image.height === 0) {
          reject(new Error('Image loaded but has zero dimensions'));
          return;
        }
        resolve(image);
      });
      image.addEventListener('error', () => {
        reject(new Error(`Failed to load image from ${url}`));
      });
      
      image.src = url;
    });

  const getEditedImg = async (
    imageSrc: string
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    
    if (!image.complete) {
      throw new Error('Image is not fully loaded');
    }
    
    if (!image.width || !image.height || image.width <= 0 || image.height <= 0) {
      throw new Error(`Invalid image dimensions: width=${image.width}, height=${image.height}`);
    }
    
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    
    if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
      throw new Error(`Invalid natural image dimensions: width=${naturalWidth}, height=${naturalHeight}`);
    }
    
    // Create canvas for the full image (no cropping)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to full image dimensions
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    // Draw the full image
    ctx.drawImage(image, 0, 0, naturalWidth, naturalHeight);

    // Apply filters using a new canvas to avoid filter stacking issues
    const filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = canvas.width;
    filteredCanvas.height = canvas.height;
    const filteredCtx = filteredCanvas.getContext('2d');

    if (!filteredCtx) {
      throw new Error('No 2d context for filtered canvas');
    }

    // Apply filters
    filteredCtx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      blur(${blur}px)
      grayscale(${grayscale}%)
      sepia(${sepia}%)
    `;
    
    filteredCtx.drawImage(canvas, 0, 0);

    // Apply watermark if enabled and available
    if (watermarkEnabled && watermarkLogoUrl && watermarkLoaded) {
      try {
        const watermarkImg = await createImage(watermarkLogoUrl);
        
        // Calculate watermark size based on scale percentage
        const watermarkSize = Math.min(naturalWidth, naturalHeight) * (watermarkScale / 100);
        const watermarkAspectRatio = watermarkImg.width / watermarkImg.height;
        const watermarkWidth = watermarkSize;
        const watermarkHeight = watermarkSize / watermarkAspectRatio;
        
        // Calculate position
        const padding = Math.min(naturalWidth, naturalHeight) * 0.02; // 2% padding
        let x = 0;
        let y = 0;
        
        switch (watermarkPosition) {
          case 'bottom-right':
            x = naturalWidth - watermarkWidth - padding;
            y = naturalHeight - watermarkHeight - padding;
            break;
          case 'bottom-left':
            x = padding;
            y = naturalHeight - watermarkHeight - padding;
            break;
          case 'top-right':
            x = naturalWidth - watermarkWidth - padding;
            y = padding;
            break;
          case 'top-left':
            x = padding;
            y = padding;
            break;
          case 'center':
            x = (naturalWidth - watermarkWidth) / 2;
            y = (naturalHeight - watermarkHeight) / 2;
            break;
        }
        
        // Draw watermark with opacity
        filteredCtx.globalAlpha = watermarkOpacity / 100;
        filteredCtx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight);
        filteredCtx.globalAlpha = 1.0; // Reset alpha
      } catch (err) {
        console.error('Error applying watermark:', err);
        // Continue without watermark if it fails
      }
    }

    return new Promise((resolve, reject) => {
      filteredCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter an image name');
      return;
    }

    if (!imageUrlState) {
      setError('No image loaded');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Verify the image can be loaded
      let testImage: HTMLImageElement;
      try {
        testImage = await createImage(imageUrlState);
        if (!testImage.width || !testImage.height || testImage.width <= 0 || testImage.height <= 0) {
          throw new Error('Image has invalid dimensions');
        }
      } catch (loadError: any) {
        setError(`Cannot load image: ${loadError.message || 'Image URL may be invalid or blocked by CORS'}`);
        setSaving(false);
        return;
      }

      // Get edited image (full image with filters applied)
      const editedImage = await getEditedImg(imageUrlState);

      await onSave(editedImage, name.trim());
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
          {/* Image Display */}
          <div className="crop-container" ref={containerRef}>
            {imageUrl && !imageUrl.includes('via.placeholder.com') ? (
              imageLoaded && imageDimensions && imageUrlState ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1a1a1a',
                  padding: '20px',
                  overflow: 'auto'
                }}>
                  {(() => {
                    // Use stable display size from useMemo (doesn't change with watermark state)
                    const displayWidth = displaySize.width;
                    const displayHeight = displaySize.height;
                    
                    // STRICT: Only calculate and render watermark if checkbox is explicitly checked
                    // Early return pattern - don't calculate anything if disabled
                    const isWatermarkEnabled = watermarkEnabled === true;
                    
                    // DEBUG: Log state to help diagnose
                    if (import.meta.env.DEV) {
                      console.log('[Watermark Debug]', {
                        watermarkEnabled,
                        isWatermarkEnabled,
                        watermarkImg: watermarkImg !== null,
                        watermarkLoaded,
                        watermarkLogoUrl: watermarkLogoUrl !== null && watermarkLogoUrl !== ''
                      });
                    }
                    
                    // Calculate watermark dimensions and position ONLY if enabled
                    let watermarkElement = null;
                    
                    // DOUBLE CHECK: Only proceed if checkbox is explicitly checked
                    if (watermarkEnabled !== true) {
                      // Checkbox is unchecked - do nothing, watermarkElement stays null
                    } else if (watermarkImg !== null && watermarkLoaded === true && watermarkLogoUrl !== null && watermarkLogoUrl !== '') {
                      const watermarkSize = Math.min(displayWidth, displayHeight) * (watermarkScale / 100);
                      const watermarkAspectRatio = watermarkImg.width / watermarkImg.height;
                      const watermarkDisplayWidth = watermarkSize;
                      const watermarkDisplayHeight = watermarkSize / watermarkAspectRatio;
                      
                      const padding = Math.min(displayWidth, displayHeight) * 0.02;
                      
                      let watermarkX = 0;
                      let watermarkY = 0;
                      
                      switch (watermarkPosition) {
                        case 'bottom-right':
                          watermarkX = displayWidth - watermarkDisplayWidth - padding;
                          watermarkY = displayHeight - watermarkDisplayHeight - padding;
                          break;
                        case 'bottom-left':
                          watermarkX = padding;
                          watermarkY = displayHeight - watermarkDisplayHeight - padding;
                          break;
                        case 'top-right':
                          watermarkX = displayWidth - watermarkDisplayWidth - padding;
                          watermarkY = padding;
                          break;
                        case 'top-left':
                          watermarkX = padding;
                          watermarkY = padding;
                          break;
                        case 'center':
                          watermarkX = (displayWidth - watermarkDisplayWidth) / 2;
                          watermarkY = (displayHeight - watermarkDisplayHeight) / 2;
                          break;
                      }
                      
                      // Only create element if dimensions are valid
                      if (watermarkDisplayWidth > 0 && watermarkDisplayHeight > 0) {
                        watermarkElement = (
                          <img
                            key={`watermark-${watermarkKey}-${watermarkPosition}`}
                            src={watermarkLogoUrl}
                            alt="Watermark"
                            style={{
                              position: 'absolute',
                              left: `${watermarkX}px`,
                              top: `${watermarkY}px`,
                              width: `${watermarkDisplayWidth}px`,
                              height: `${watermarkDisplayHeight}px`,
                              opacity: watermarkOpacity / 100,
                              pointerEvents: 'none',
                              zIndex: 10,
                              display: 'block'
                            }}
                            crossOrigin="anonymous"
                          />
                        );
                      }
                    }
                    
                    return (
                      <div style={{ position: 'relative', display: 'inline-block', width: `${displayWidth}px`, height: `${displayHeight}px` }}>
                        <img
                          src={imageUrlState}
                          alt="Editing preview"
                          style={{
                            width: `${displayWidth}px`,
                            height: `${displayHeight}px`,
                            objectFit: 'contain',
                            display: 'block',
                            filter: `
                              brightness(${brightness}%)
                              contrast(${contrast}%)
                              saturate(${saturation}%)
                              blur(${blur}px)
                              grayscale(${grayscale}%)
                              sepia(${sepia}%)
                            `
                          }}
                          crossOrigin="anonymous"
                        />
                        {/* Render watermark element ONLY if checkbox is checked and element was created */}
                        {/* Explicitly check watermarkEnabled again before rendering */}
                        {watermarkEnabled === true && watermarkElement !== null ? watermarkElement : null}
                      </div>
                    );
                  })()}
                </div>
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
                  <p style={{ fontSize: '18px', marginBottom: '10px' }}>Loading image...</p>
                  {imageUrl && (
                    <p style={{ fontSize: '12px', marginTop: '10px', color: '#666', wordBreak: 'break-all', maxWidth: '100%' }}>
                      URL: {imageUrl}
                    </p>
                  )}
                  {error && (
                    <p style={{ fontSize: '12px', marginTop: '10px', color: '#c33', maxWidth: '100%' }}>
                      Error: {error}
                    </p>
                  )}
                </div>
              )
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
                  step={0.1}
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Grayscale: {grayscale}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={grayscale}
                  onChange={(e) => setGrayscale(Number(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Sepia: {sepia}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sepia}
                  onChange={(e) => setSepia(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Watermark Controls */}
            {watermarkLogoUrl && (
              <div className="control-section">
                <h3>Watermark</h3>
                <div className="control-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={watermarkEnabled}
                      onChange={(e) => setWatermarkEnabled(e.target.checked)}
                      disabled={!watermarkLoaded}
                    />
                    <span>Enable Watermark</span>
                  </label>
                  {!watermarkLoaded && (
                    <small style={{ color: '#666', fontSize: '0.85em' }}>Loading watermark logo...</small>
                  )}
                </div>
                {watermarkEnabled && watermarkLoaded && (
                  <>
                    <div className="control-group">
                      <label>Position</label>
                      <select
                        value={watermarkPosition}
                        onChange={(e) => {
                          setWatermarkPosition(e.target.value as any);
                          setWatermarkKey(prev => prev + 1); // Force re-render to remove old watermark
                        }}
                        style={{ width: '100%', padding: '5px' }}
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                        <option value="center">Center</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label>Opacity: {watermarkOpacity}%</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      />
                    </div>
                    <div className="control-group">
                      <label>Size: {watermarkScale}%</label>
                      <input
                        type="range"
                        min={5}
                        max={50}
                        value={watermarkScale}
                        onChange={(e) => setWatermarkScale(Number(e.target.value))}
                      />
                      <small style={{ color: '#666', fontSize: '0.85em' }}>
                        Percentage of image size
                      </small>
                    </div>
                  </>
                )}
              </div>
            )}
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
    </div>
  );
}
