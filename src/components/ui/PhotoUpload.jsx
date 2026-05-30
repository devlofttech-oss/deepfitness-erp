import { useRef, useState } from 'react';
import { uploadToCloudinary } from '../../utils/cloudinary';
import toast from 'react-hot-toast';

export default function PhotoUpload({ onUpload, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onUpload(url);
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={compact
          ? 'flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50'
          : 'flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50'
        }
      >
        {uploading
          ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Uploading...</>
          : <><span className="material-symbols-outlined text-[16px]">photo_camera</span> {compact ? 'Change Photo' : 'Upload Photo'}</>
        }
      </button>
    </>
  );
}
