'use client';

import { useState } from 'react';
import { UploadFlow } from '@/components/UploadFlow';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { Header } from '@/components/Header';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'view'>('upload');
  const [meetingId, setMeetingId] = useState<string | null>(null);

  const handleUploadComplete = (id: string) => {
    setMeetingId(id);
    setCurrentStep('processing');
  };

  const handleProcessingComplete = () => {
    setCurrentStep('view');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {currentStep === 'upload' && (
          <UploadFlow onComplete={handleUploadComplete} />
        )}
        
        {currentStep === 'processing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Processing your transcript...
            </h2>
            <p className="mt-2 text-gray-600">
              We're analyzing your meeting content and extracting key decisions.
            </p>
          </div>
        )}
        
        {currentStep === 'view' && meetingId && (
          <TranscriptViewer 
            meetingId={meetingId} 
            onProcessingComplete={handleProcessingComplete}
          />
        )}
      </main>
    </div>
  );
}

