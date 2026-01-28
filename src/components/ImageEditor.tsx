import { useState, useCallback, useRef, useEffect } from 'react';
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageReadyForCropper, setImageReadyForCropper] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null); // Blob URL for Cropper
  
  // Debug: Log when imageReadyForCropper changes
  useEffect(() => {
    console.log('[ImageEditor] imageReadyForCropper state changed:', imageReadyForCropper);
  }, [imageReadyForCropper]);
  
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
  
  // Load image to get dimensions when component mounts
  useEffect(() => {
    const loadImage = async () => {
      try {
        setImageLoaded(false);
        setImageDimensions(null);
        setCroppedAreaPixels(null); // Reset crop area when image changes
        setError(''); // Clear previous errors
        
        console.log('[ImageEditor] Loading image:', imageUrl);
        
        if (!imageUrl) {
          setError('No image URL provided');
          return;
        }
        
        const img = await createImage(imageUrl);
        console.log('[ImageEditor] Image created, complete:', img.complete, 'dimensions:', img.width, 'x', img.height, 'crossOrigin:', img.crossOrigin);
        
        // Function to test if we can draw the image to a canvas (required for Cropper)
        // This verifies CORS is working correctly
        const testCanvasAccess = () => {
          console.log('[ImageEditor] ===== Starting canvas test =====');
          console.log('[ImageEditor] Image object:', { 
            complete: img.complete, 
            naturalWidth: img.naturalWidth, 
            naturalHeight: img.naturalHeight,
            width: img.width,
            height: img.height,
            crossOrigin: img.crossOrigin
          });
          
          try {
            const testCanvas = document.createElement('canvas');
            const naturalWidth = img.naturalWidth || img.width || 100;
            const naturalHeight = img.naturalHeight || img.height || 100;
            testCanvas.width = naturalWidth;
            testCanvas.height = naturalHeight;
            const testCtx = testCanvas.getContext('2d');
            
            if (!testCtx) {
              console.error('[ImageEditor] ✗ Canvas context not available');
              setError('Canvas not supported in this browser');
              setImageReadyForCropper(false);
              return;
            }
            
            console.log('[ImageEditor] Drawing image to canvas...');
            testCtx.drawImage(img, 0, 0);
            console.log('[ImageEditor] Image drawn successfully, attempting to read pixel data...');
            
            // Try to read pixel data to verify CORS is working
            const imageData = testCtx.getImageData(0, 0, 1, 1);
            console.log('[ImageEditor] ✓✓✓ Canvas test SUCCESSFUL - image can be manipulated');
            console.log('[ImageEditor] Canvas test - first pixel:', imageData.data[0], imageData.data[1], imageData.data[2], imageData.data[3]);
            
            // Convert canvas to blob URL for Cropper (this ensures CORS is fully resolved)
            console.log('[ImageEditor] Converting image to blob URL for Cropper...');
            testCanvas.toBlob((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                console.log('[ImageEditor] ✓✓✓ Created blob URL for Cropper:', blobUrl);
                setCropperImageUrl(blobUrl);
                setImageReadyForCropper(true);
                console.log('[ImageEditor] ===== Canvas test complete - Cropper should now be enabled with blob URL =====');
              } else {
                console.error('[ImageEditor] ✗ Failed to create blob from canvas, using original URL');
                setCropperImageUrl(imageUrl);
                setImageReadyForCropper(true);
              }
            }, 'image/png');
          } catch (canvasError: any) {
            console.error('[ImageEditor] ✗✗✗ Canvas test FAILED:', canvasError);
            console.error('[ImageEditor] Canvas error type:', canvasError.name);
            console.error('[ImageEditor] Canvas error message:', canvasError.message);
            console.error('[ImageEditor] Canvas error stack:', canvasError.stack);
            
            if (canvasError.message && (canvasError.message.includes('tainted') || canvasError.message.includes('cross-origin') || canvasError.name === 'SecurityError')) {
              console.error('[ImageEditor] CORS/tainted canvas error detected - Cropper will NOT work');
              setError('Image cannot be edited due to CORS restrictions. The proxy may not be setting CORS headers correctly.');
              setImageReadyForCropper(false);
            } else {
              console.warn('[ImageEditor] Canvas error (non-CORS) - allowing Cropper to try anyway');
              setImageReadyForCropper(true);
            }
            console.log('[ImageEditor] ===== Canvas test complete =====');
          }
        };
        
        // Function to check and set image dimensions
        const checkAndSetDimensions = () => {
          if (img.complete && img.width > 0 && img.height > 0) {
            const naturalWidth = img.naturalWidth || img.width;
            const naturalHeight = img.naturalHeight || img.height;
            if (naturalWidth > 0 && naturalHeight > 0) {
              console.log('[ImageEditor] Image dimensions set:', naturalWidth, 'x', naturalHeight);
              setImageDimensions({ width: naturalWidth, height: naturalHeight });
              setImageLoaded(true);
              return true;
            }
          }
          return false;
        };
        
        // Wait for image to load if not complete
        const loadHandler = () => {
          console.log('[ImageEditor] Image load event fired');
          if (checkAndSetDimensions()) {
            console.log('[ImageEditor] Image loaded successfully');
            // Run canvas test now that image is fully loaded
            testCanvasAccess();
          } else {
            console.warn('[ImageEditor] Image loaded but dimensions invalid');
            setError('Image loaded but has invalid dimensions');
          }
        };
        
        // Check if already loaded
        if (checkAndSetDimensions()) {
          // Image is already loaded, run canvas test immediately
          testCanvasAccess();
        }
        
        const errorHandler = (e: any) => {
          console.error('[ImageEditor] Image load error:', e, 'URL:', imageUrl);
          setError(`Failed to load image from: ${imageUrl}. The image may be blocked by CORS or the URL may be invalid.`);
          setImageLoaded(false);
        };
        
        img.addEventListener('load', loadHandler, { once: true });
        img.addEventListener('error', errorHandler, { once: true });
        
        // Cleanup
        return () => {
          img.removeEventListener('load', loadHandler);
          img.removeEventListener('error', errorHandler);
          // Clean up blob URL if it exists
          if (cropperImageUrl && cropperImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(cropperImageUrl);
          }
        };
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
      setImageLoaded(true); // Allow placeholder images
      setImageDimensions({ width: 800, height: 600 }); // Default dimensions for placeholders
    }
  }, [imageUrl]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    // Don't process crop area if image isn't fully loaded yet
    if (!imageLoaded || !imageDimensions) {
      return; // Silently ignore until image is ready
    }
    
    // Validate crop area before setting - reject NaN, undefined, or invalid values
    if (!croppedAreaPixels) {
      return; // Silently ignore null/undefined
    }
    
    const width = Number(croppedAreaPixels.width);
    const height = Number(croppedAreaPixels.height);
    const x = Number(croppedAreaPixels.x);
    const y = Number(croppedAreaPixels.y);
    
    // Check for valid numbers (not NaN, not Infinity, positive dimensions)
    if (isFinite(width) && isFinite(height) && isFinite(x) && isFinite(y) &&
        width > 0 && height > 0 && !isNaN(width) && !isNaN(height) && !isNaN(x) && !isNaN(y)) {
      setCroppedAreaPixels({
        x: x,
        y: y,
        width: width,
        height: height
      });
    }
    // Silently ignore invalid values - don't log warnings to reduce console spam
  }, [imageLoaded, imageDimensions]);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      
      // Always set CORS for images from different origins (including proxied URLs)
      // This is required for the Cropper component to work with canvas manipulation
      const imageUrl = new URL(url, window.location.href);
      const currentOrigin = window.location.origin;
      
      // If it's a proxied URL (from our backend), we still need CORS because
      // the frontend and backend are on different domains
      if (imageUrl.origin !== currentOrigin || url.includes('/api/v1/images/proxy')) {
        image.setAttribute('crossOrigin', 'anonymous');
        console.log('[ImageEditor] Setting CORS for image:', url.substring(0, 80) + '...');
      }
      
      image.addEventListener('load', () => {
        console.log('[ImageEditor] Image loaded successfully, dimensions:', image.width, 'x', image.height, 'natural:', image.naturalWidth, 'x', image.naturalHeight);
        if (image.width === 0 || image.height === 0) {
          reject(new Error('Image loaded but has zero dimensions'));
          return;
        }
        resolve(image);
      });
      image.addEventListener('error', (error) => {
        console.error('[ImageEditor] Image load error:', error, 'URL:', url);
        reject(new Error(`Failed to load image from ${url}. The image may be blocked by CORS policy or the URL may be invalid.`));
      });
      
      console.log('[ImageEditor] Starting to load image:', url.substring(0, 80) + '...');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob> => {
    // Validate crop area first
    if (!pixelCrop || pixelCrop.width <= 0 || pixelCrop.height <= 0) {
      throw new Error(`Invalid crop area: width=${pixelCrop?.width}, height=${pixelCrop?.height}`);
    }

    const image = await createImage(imageSrc);
    
    // Ensure image is fully loaded and has valid dimensions
    if (!image.complete) {
      throw new Error('Image is not fully loaded');
    }
    
    if (!image.width || !image.height || image.width <= 0 || image.height <= 0) {
      throw new Error(`Invalid image dimensions: width=${image.width}, height=${image.height}. Image may not have loaded correctly.`);
    }
    
    // Ensure image natural dimensions are available
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    
    if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
      throw new Error(`Invalid natural image dimensions: width=${naturalWidth}, height=${naturalHeight}`);
    }
    
    // Create a temporary canvas for rotation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      throw new Error('No 2d context');
    }

    // Calculate safe area for rotation
    // Use natural dimensions if available, otherwise use displayed dimensions
    const imgWidth = image.naturalWidth || image.width;
    const imgHeight = image.naturalHeight || image.height;
    const maxSize = Math.max(imgWidth, imgHeight);
    
    if (maxSize <= 0 || !isFinite(maxSize)) {
      throw new Error(`Invalid max size for rotation: ${maxSize} (image: ${imgWidth}x${imgHeight})`);
    }
    
    const safeArea = Math.ceil(2 * ((maxSize / 2) * Math.sqrt(2)));

    // Ensure safe area is valid
    if (safeArea <= 0 || !isFinite(safeArea)) {
      throw new Error(`Invalid safe area: ${safeArea}`);
    }

    tempCanvas.width = safeArea;
    tempCanvas.height = safeArea;

    // Center and rotate the image
    tempCtx.translate(safeArea / 2, safeArea / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.translate(-safeArea / 2, -safeArea / 2);

    tempCtx.drawImage(
      image,
      safeArea / 2 - imgWidth * 0.5,
      safeArea / 2 - imgHeight * 0.5
    );

    // Create final canvas for cropping
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to crop area (ensure positive integers)
    // Handle NaN, undefined, or invalid values
    const rawWidth = Number(pixelCrop.width) || 0;
    const rawHeight = Number(pixelCrop.height) || 0;
    const cropWidth = Math.max(1, Math.round(Math.abs(rawWidth)));
    const cropHeight = Math.max(1, Math.round(Math.abs(rawHeight)));
    
    if (cropWidth <= 0 || cropHeight <= 0 || !isFinite(cropWidth) || !isFinite(cropHeight) || isNaN(cropWidth) || isNaN(cropHeight)) {
      throw new Error(`Invalid crop dimensions: width=${cropWidth}, height=${cropHeight} (original: ${pixelCrop.width}, ${pixelCrop.height})`);
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Double-check canvas dimensions were set correctly
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(`Canvas dimensions are 0 after setting: width=${canvas.width}, height=${canvas.height}`);
    }

    // Calculate source coordinates in the rotated image
    // pixelCrop coordinates from react-easy-crop are relative to the natural image size
    const sourceX = Math.round(Math.max(0, safeArea / 2 - imgWidth * 0.5 + pixelCrop.x));
    const sourceY = Math.round(Math.max(0, safeArea / 2 - imgHeight * 0.5 + pixelCrop.y));
    const sourceWidth = Math.min(cropWidth, safeArea - sourceX);
    const sourceHeight = Math.min(cropHeight, safeArea - sourceY);

    // Validate source coordinates
    if (sourceWidth <= 0 || sourceHeight <= 0 || !isFinite(sourceX) || !isFinite(sourceY)) {
      throw new Error(`Invalid source coordinates: x=${sourceX}, y=${sourceY}, width=${sourceWidth}, height=${sourceHeight}`);
    }

    // Draw the cropped portion from the rotated image
    ctx.drawImage(
      tempCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

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
    // Validate crop area
    if (!croppedAreaPixels) {
      setError('Please adjust the crop area');
      return;
    }

    // Validate crop area dimensions
    if (!croppedAreaPixels.width || !croppedAreaPixels.height || 
        croppedAreaPixels.width <= 0 || croppedAreaPixels.height <= 0 ||
        !isFinite(croppedAreaPixels.width) || !isFinite(croppedAreaPixels.height)) {
      setError('Invalid crop area. Please adjust the crop selection.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter an image name');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // First, verify the image can be loaded and has valid dimensions
      let testImage: HTMLImageElement;
      try {
        testImage = await createImage(imageUrl);
        if (!testImage.width || !testImage.height || testImage.width <= 0 || testImage.height <= 0) {
          throw new Error('Image has invalid dimensions');
        }
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
              imageLoaded && imageDimensions && imageReadyForCropper ? (
                <>
                  {console.log('[ImageEditor] Rendering Cropper - blob URL:', cropperImageUrl, 'original URL:', imageUrl, 'States:', { imageLoaded, imageDimensions, imageReadyForCropper })}
                  {cropperImageUrl ? (
                    <Cropper
                      image={cropperImageUrl}
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
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        backgroundColor: '#1a1a1a',
                        filter: `
                          brightness(${brightness}%)
                          contrast(${contrast}%)
                          saturate(${saturation}%)
                          blur(${blur}px)
                          grayscale(${grayscale}%)
                          sepia(${sepia}%)
                        `
                      },
                      cropAreaStyle: {
                        border: '2px solid #007bff'
                      },
                      mediaStyle: {
                        objectFit: 'contain'
                      }
                    }}
                  />
                  {/* Debug: Show image directly to verify it loads - make it very visible */}
                  <div style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    width: '200px',
                    height: '200px',
                    border: '5px solid red',
                    zIndex: 99999,
                    backgroundColor: 'yellow',
                    padding: '10px',
                    boxShadow: '0 0 20px rgba(255,0,0,0.8)'
                  }}>
                    <div style={{ color: 'black', fontSize: '12px', marginBottom: '5px', fontWeight: 'bold' }}>
                      DEBUG IMAGE
                    </div>
                    <img 
                      src={imageUrl} 
                      alt="Debug" 
                      style={{ width: '100%', height: 'calc(100% - 20px)', objectFit: 'contain', border: '2px solid blue' }}
                      crossOrigin="anonymous"
                      onLoad={() => {
                        console.log('[ImageEditor] ✓✓✓ Debug image loaded successfully in Cropper');
                        console.log('[ImageEditor] Debug image URL:', imageUrl);
                      }}
                      onError={(e) => {
                        console.error('[ImageEditor] ✗✗✗ Debug image FAILED to load in Cropper:', e);
                        console.error('[ImageEditor] Failed URL:', imageUrl);
                      }}
                    />
                  </div>
                </>
              ) : imageLoaded && imageDimensions ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1a1a1a',
                  color: '#fff'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p>Preparing image for editing...</p>
                    <img 
                      src={imageUrl} 
                      alt="Loading preview" 
                      style={{ 
                        maxWidth: '50%', 
                        maxHeight: '50%',
                        objectFit: 'contain',
                        opacity: 0.3
                      }}
                      crossOrigin="anonymous"
                      onLoad={() => console.log('[ImageEditor] Preview image loaded')}
                    />
                  </div>
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

