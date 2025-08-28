'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface UploadFlowProps {
  onComplete: (meetingId: string) => void;
}

export function UploadFlow({ onComplete }: UploadFlowProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    const allowedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'audio/wav',
      'audio/mp3',
      'audio/m4a',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid file type (text, Word, PDF, or audio)');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('date', new Date().toISOString());

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      const response = await fetch('/api/meetings/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      toast.success('File uploaded successfully!');
      
      // Wait a moment to show completion
      setTimeout(() => {
        onComplete(result.meetingId);
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'audio/wav': ['.wav'],
      'audio/mp3': ['.mp3'],
      'audio/m4a': ['.m4a'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Meeting Transcript
        </h1>
        <p className="text-lg text-gray-600">
          Upload your meeting transcript, audio file, or notes to generate actionable contracts.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div>
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Uploading...
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {uploadProgress}% complete
            </p>
          </div>
        ) : (
          <div>
            {isDragActive ? (
              <CloudArrowUpIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            ) : (
              <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            )}
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              or click to browse
            </p>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>Supported formats: TXT, DOCX, PDF, WAV, MP3, M4A</p>
              <p>Maximum file size: 50MB</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          What happens next?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Process Transcript</h4>
            <p className="text-sm text-gray-600">
              We'll analyze your content and extract key decisions and obligations.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-semibold">2</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Generate Draft</h4>
            <p className="text-sm text-gray-600">
              Our AI will create a contract draft based on the extracted information.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-semibold">3</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Review & Export</h4>
            <p className="text-sm text-gray-600">
              Review the draft, make edits, and export in your preferred format.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

