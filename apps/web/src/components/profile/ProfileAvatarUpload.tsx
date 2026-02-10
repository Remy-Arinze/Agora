'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useUploadProfileImageMutation } from '@/lib/store/api/apiSlice';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/lib/store/slices/authSlice';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ProfileAvatarUploadProps {
  currentImage?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  onImageUpdate?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfileAvatarUpload({
  currentImage,
  firstName,
  lastName,
  onImageUpdate,
  size = 'lg',
}: ProfileAvatarUploadProps) {
  const [uploadImage, { isLoading }] = useUploadProfileImageMutation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const getInitials = () => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'U';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const result = await uploadImage({ file }).unwrap();
      if (result.success && result.data?.profileImage) {
        const newImageUrl = result.data.profileImage;
        setPreview(newImageUrl);
        onImageUpdate?.(newImageUrl);
        
        // Update Redux state
        if (user) {
          dispatch(
            setCredentials({
              accessToken: '', // Keep existing token
              user: {
                ...user,
                profileImage: newImageUrl,
              },
            })
          );
        }
        
        toast.success('Profile image updated successfully!');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to upload image. Please try again.');
      // Revert preview on error
      setPreview(currentImage || null);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div
        className={cn(
          'relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center cursor-pointer group',
          sizeClasses[size]
        )}
        onClick={handleClick}
      >
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        ) : preview ? (
          <img
            src={preview}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
            {getInitials()}
          </span>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="h-6 w-6 text-white" />
        </div>
      </div>
      
      {/* Edit icon badge */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
        title="Upload profile image"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <Camera className="h-4 w-4 text-white" />
        )}
      </button>
    </div>
  );
}
