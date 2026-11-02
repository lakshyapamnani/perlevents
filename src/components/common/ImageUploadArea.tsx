import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Plus,
  Link as LinkIcon,
  Eye,
  Check,
} from 'lucide-react';
import { Attachment } from '../../types';

interface ImageUploadAreaProps {
  label?: string;
  description?: string;
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  maxPhotos?: number;
  compact?: boolean;
}

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  label = 'Photos & Document Attachments',
  description = 'Upload reference photos, client sign-offs, banquet setup, or proof receipts.',
  attachments = [],
  onChange,
  maxPhotos = 12,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<any>('stage');
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (attachments.length >= maxPhotos) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const newAttachment: Attachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            url: result,
            caption: captionInput.trim() || file.name,
            category: categoryInput,
            uploadedBy: 'Current User',
            uploadedAt: new Date().toISOString(),
            sizeBytes: file.size,
          };
          onChange([...attachments, newAttachment]);
          setCaptionInput('');
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    const newAttachment: Attachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: captionInput.trim() || 'Attached Photo',
      url: urlInput.trim(),
      caption: captionInput.trim() || undefined,
      category: categoryInput,
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString(),
    };
    onChange([...attachments, newAttachment]);
    setUrlInput('');
    setCaptionInput('');
    setShowUrlBox(false);
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <label className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
            <span>{label}</span>
            <span className="text-[11px] font-normal text-stone-600 dark:text-stone-400">
              ({attachments.length}/{maxPhotos})
            </span>
          </label>
          {description && (
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">{description}</p>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => setShowUrlBox(!showUrlBox)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1 transition-colors"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlBox ? 'Hide URL' : 'From URL'}</span>
          </button>
        </div>
      </div>

      {/* URL or Meta Box */}
      {showUrlBox && (
        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 animate-fade-in text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-stone-600 dark:text-stone-400 mb-0.5">
                Image Web URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-600 dark:text-stone-400 mb-0.5">
                Category
              </label>
              <select
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              >
                <option value="stage">Stage Decor</option>
                <option value="entrance">Entrance Arch</option>
                <option value="seating">Seating & Dining</option>
                <option value="lighting">Lighting & AV</option>
                <option value="floral">Floral Concepts</option>
                <option value="evidence">Setup Proof / Evidence</option>
                <option value="other">Receipt / Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Photo caption (e.g., Client approved golden floral arch)..."
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-semibold hover:bg-emerald-900 disabled:opacity-50 text-xs"
            >
              Add Photo
            </button>
          </div>
        </div>
      )}

      {/* Thumbnails Gallery Grid */}
      {attachments.length > 0 ? (
        <div
          className={`grid gap-2.5 ${
            compact
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }`}
        >
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 shadow-xs"
            >
              <div className="aspect-4/3 w-full overflow-hidden bg-stone-200 dark:bg-stone-800 relative">
                <img
                  src={att.url}
                  alt={att.caption || att.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback on broken image
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                {/* Category badge */}
                {att.category && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded bg-stone-900/80 backdrop-blur-xs text-white">
                    {att.category}
                  </span>
                )}
                {/* Hover overlay controls */}
                <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(att.url)}
                    className="p-1.5 rounded-full bg-white/90 text-stone-900 hover:bg-white shadow-sm"
                    title="View Full Size"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-sm"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Caption footer */}
              <div className="p-1.5 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
                <p className="text-[11px] font-medium text-stone-900 dark:text-stone-100 truncate">
                  {att.caption || att.name}
                </p>
                {/* Always-visible delete on mobile devices */}
                <div className="sm:hidden flex items-center justify-between mt-1 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(att.url)}
                    className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    className="text-[10px] text-red-700 dark:text-red-400 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-700 dark:hover:border-emerald-600 rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-900/50"
        >
          <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Click to upload images from your phone or computer
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            PNG, JPG, WebP supported. High resolution stage, banquet decor & receipts.
          </p>
        </div>
      )}

      {/* Enlarged Image Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-60 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-stone-800/80 text-white hover:bg-stone-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalUrl}
              alt="Enlarged Preview"
              className="max-h-[82vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
