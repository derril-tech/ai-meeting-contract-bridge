'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SpeakerWaveIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface TranscriptViewerProps {
  meetingId: string;
  onProcessingComplete: () => void;
}

interface SpeakerTurn {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  processingResult?: {
    speakerTurns: SpeakerTurn[];
    roleTags: Record<string, string>;
    language: string;
    confidence: number;
  };
}

export function TranscriptViewer({ meetingId, onProcessingComplete }: TranscriptViewerProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeeting();
  }, [meetingId]);

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meetings/${meetingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch meeting');
      }

      const data = await response.json();
      setMeeting(data);

      // If processing is complete, notify parent
      if (data.status === 'completed') {
        onProcessingComplete();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Loading transcript...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <DocumentTextIcon className="w-16 h-16 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Error loading transcript
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchMeeting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">
          Meeting not found
        </h2>
      </div>
    );
  }

  const speakerTurns = meeting.processingResult?.speakerTurns || [];
  const roleTags = meeting.processingResult?.roleTags || {};

  return (
    <div className="max-w-4xl mx-auto">
      {/* Meeting Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <p className="text-gray-600">
              {format(new Date(meeting.date), 'PPP')}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <ClockIcon className="w-4 h-4 mr-1" />
              {speakerTurns.length > 0 && (
                <span>
                  {formatTime(speakerTurns[speakerTurns.length - 1].endTime)}
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <SpeakerWaveIcon className="w-4 h-4 mr-1" />
              <span>{Object.keys(roleTags).length} speakers</span>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            meeting.status === 'completed' ? 'bg-green-500' :
            meeting.status === 'processing' ? 'bg-yellow-500' :
            meeting.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
          }`}></div>
          <span className="text-sm text-gray-600 capitalize">
            {meeting.status}
          </span>
        </div>
      </div>

      {/* Transcript Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Transcript
          </h2>
          {meeting.processingResult?.language && (
            <p className="text-sm text-gray-600">
              Language: {meeting.processingResult.language}
            </p>
          )}
        </div>

        <div className="p-6">
          {speakerTurns.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {meeting.status === 'processing' 
                  ? 'Transcript is being processed...' 
                  : 'No transcript available'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {speakerTurns.map((turn, index) => (
                <div key={index} className="flex space-x-4">
                  {/* Speaker Info */}
                  <div className="flex-shrink-0 w-24">
                    <div className="text-sm font-medium text-gray-900">
                      {turn.speaker}
                    </div>
                    {roleTags[turn.speaker] && (
                      <div className="text-xs text-gray-500">
                        {roleTags[turn.speaker]}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(turn.startTime)}
                    </div>
                  </div>

                  {/* Speech Content */}
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-900">{turn.text}</p>
                      {turn.confidence < 0.8 && (
                        <div className="mt-2 text-xs text-yellow-600">
                          Low confidence: {Math.round(turn.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-center space-x-4">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Refresh
        </button>
        {meeting.status === 'completed' && (
          <button
            onClick={() => {/* TODO: Navigate to decisions view */}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Decisions
          </button>
        )}
      </div>
    </div>
  );
}

