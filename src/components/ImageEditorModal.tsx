import { useState, useEffect } from 'react';
import './ImageEditorModal.css';

interface Image {
  id: number;
  file_path: string;
  source_url: string;
}

interface BucketImage {
  id: number;
  friendly_name: string;
  description: string;
  twitter_description: string;
  force_send_date: string | null;
  repeat: boolean;
  post_to: number;
  use_watermark: boolean;
  image: Image;
  created_at: string;
  updated_at: string;
}

interface ImageEditorModalProps {
  bucketImage: BucketImage;
  bucketId: number;
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
}

// Social media platform bit flags (from Rails backend)
const SOCIAL_PLATFORMS = {
  FACEBOOK: 1,
  TWITTER: 2,
  LINKEDIN: 4,
  GMB: 8,
  INSTAGRAM: 16,
  PINTEREST: 32,
};

export default function ImageEditorModal({ bucketImage, bucketId: _bucketId, onClose, onSave }: ImageEditorModalProps) {
  const [friendlyName, setFriendlyName] = useState(bucketImage.friendly_name);
  const [description, setDescription] = useState(bucketImage.description || '');
  const [twitterDescription, setTwitterDescription] = useState(bucketImage.twitter_description || '');
  const [useWatermark, setUseWatermark] = useState(bucketImage.use_watermark || false);
  const [repeat, setRepeat] = useState(bucketImage.repeat || false);
  const [forceSendDate, setForceSendDate] = useState(bucketImage.force_send_date || '');
  
  // Social media checkboxes
  const [postToFacebook, setPostToFacebook] = useState(false);
  const [postToTwitter, setPostToTwitter] = useState(false);
  const [postToLinkedIn, setPostToLinkedIn] = useState(false);
  const [postToGMB, setPostToGMB] = useState(false);
  const [postToInstagram, setPostToInstagram] = useState(false);
  const [postToPinterest, setPostToPinterest] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Parse post_to bit flags on mount
  useEffect(() => {
    const postTo = bucketImage.post_to || 0;
    setPostToFacebook((postTo & SOCIAL_PLATFORMS.FACEBOOK) !== 0);
    setPostToTwitter((postTo & SOCIAL_PLATFORMS.TWITTER) !== 0);
    setPostToLinkedIn((postTo & SOCIAL_PLATFORMS.LINKEDIN) !== 0);
    setPostToGMB((postTo & SOCIAL_PLATFORMS.GMB) !== 0);
    setPostToInstagram((postTo & SOCIAL_PLATFORMS.INSTAGRAM) !== 0);
    setPostToPinterest((postTo & SOCIAL_PLATFORMS.PINTEREST) !== 0);
  }, [bucketImage.post_to]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Calculate post_to bit flag
      let postTo = 0;
      if (postToFacebook) postTo |= SOCIAL_PLATFORMS.FACEBOOK;
      if (postToTwitter) postTo |= SOCIAL_PLATFORMS.TWITTER;
      if (postToLinkedIn) postTo |= SOCIAL_PLATFORMS.LINKEDIN;
      if (postToGMB) postTo |= SOCIAL_PLATFORMS.GMB;
      if (postToInstagram) postTo |= SOCIAL_PLATFORMS.INSTAGRAM;
      if (postToPinterest) postTo |= SOCIAL_PLATFORMS.PINTEREST;

      const updatedData = {
        friendly_name: friendlyName,
        description: description,
        twitter_description: twitterDescription,
        use_watermark: useWatermark,
        repeat: repeat,
        force_send_date: forceSendDate || null,
        post_to: postTo,
      };

      await onSave(updatedData);
      onClose();
    } catch (err: any) {
      console.error('Error saving image:', err);
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Image</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-body">
          {/* Image Preview */}
          <div className="image-preview-section">
            <img
              src={bucketImage.image.file_path.startsWith('http') 
                ? bucketImage.image.file_path 
                : `http://localhost:3000/${bucketImage.image.file_path}`}
              alt={bucketImage.friendly_name}
              className="preview-image"
            />
          </div>

          {/* Form Fields */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="friendlyName">Image Name *</label>
              <input
                id="friendlyName"
                type="text"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="e.g., Summer Sale Banner"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Main post description (for Facebook, LinkedIn, GMB, Instagram)"
                rows={3}
              />
              <small className="form-hint">Used for Facebook, LinkedIn, GMB, and Instagram posts</small>
            </div>

            <div className="form-group">
              <label htmlFor="twitterDescription">Twitter Description</label>
              <textarea
                id="twitterDescription"
                value={twitterDescription}
                onChange={(e) => setTwitterDescription(e.target.value)}
                placeholder="Twitter-specific description (280 characters max)"
                rows={2}
                maxLength={280}
              />
              <small className="form-hint">
                {twitterDescription.length}/280 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="forceSendDate">Force Send Date (Optional)</label>
              <input
                id="forceSendDate"
                type="datetime-local"
                value={forceSendDate}
                onChange={(e) => setForceSendDate(e.target.value)}
              />
              <small className="form-hint">Schedule this specific image for a specific date/time</small>
            </div>

            {/* Social Media Platforms */}
            <div className="form-group">
              <label>Post To Platforms</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={postToFacebook}
                    onChange={(e) => setPostToFacebook(e.target.checked)}
                  />
                  <span>📘 Facebook</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={postToTwitter}
                    onChange={(e) => setPostToTwitter(e.target.checked)}
                  />
                  <span>🐦 Twitter</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={postToLinkedIn}
                    onChange={(e) => setPostToLinkedIn(e.target.checked)}
                  />
                  <span>💼 LinkedIn</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={postToGMB}
                    onChange={(e) => setPostToGMB(e.target.checked)}
                  />
                  <span>🗺️ Google My Business</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={postToInstagram}
                    onChange={(e) => setPostToInstagram(e.target.checked)}
                  />
                  <span>📷 Instagram</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={postToPinterest}
                    onChange={(e) => setPostToPinterest(e.target.checked)}
                  />
                  <span>📌 Pinterest</span>
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="form-group">
              <label>Options</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useWatermark}
                    onChange={(e) => setUseWatermark(e.target.checked)}
                  />
                  <span>💧 Apply Watermark</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={repeat}
                    onChange={(e) => setRepeat(e.target.checked)}
                  />
                  <span>🔁 Repeat Annually</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-save" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

