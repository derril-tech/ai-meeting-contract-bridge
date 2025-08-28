'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface ContractEditorProps {
  draftId: string;
  content: string;
  placeholders: Array<{
    name: string;
    value: string | null;
    required: boolean;
    type: string;
    description: string;
  }>;
  deviations: Array<{
    clauseId: string;
    type: 'added' | 'removed' | 'modified';
    description: string;
    risk: 'low' | 'medium' | 'high';
  }>;
  onSave: (content: string) => void;
}

export function ContractEditor({ 
  draftId, 
  content, 
  placeholders, 
  deviations, 
  onSave 
}: ContractEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your contract content...',
      }),
    ],
    content,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      // Auto-save functionality could be implemented here
    },
  });

  const handleSave = async () => {
    if (!editor) return;

    setSaving(true);
    try {
      const updatedContent = editor.getHTML();
      await onSave(updatedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'medium': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'low': return <CheckCircleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Draft</h1>
            <p className="text-gray-600">Review and edit your generated contract</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isEditing 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditing ? (
                <>
                  <EyeIcon className="w-4 h-4" />
                  <span>View</span>
                </>
              ) : (
                <>
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </>
              )}
            </button>
            
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <DocumentTextIcon className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-blue-900">Placeholders</div>
              <div className="text-sm text-blue-700">
                {placeholders.filter(p => !p.value).length} remaining
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-yellow-900">Deviations</div>
              <div className="text-sm text-yellow-700">
                {deviations.length} detected
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <div className="text-sm font-medium text-green-900">Status</div>
              <div className="text-sm text-green-700">
                {isEditing ? 'Editing' : 'Ready'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Contract Content</h2>
              {isEditing && (
                <p className="text-sm text-gray-600 mt-1">
                  Make your edits below. Changes will be tracked automatically.
                </p>
              )}
            </div>
            
            <div className="p-6">
              <EditorContent 
                editor={editor} 
                className={`
                  prose prose-sm max-w-none
                  ${isEditing ? 'border border-gray-300 rounded-lg p-4' : ''}
                `}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Placeholders */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Placeholders</h3>
            <div className="space-y-3">
              {placeholders.map((placeholder, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    placeholder.value 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {placeholder.name}
                    </span>
                    {placeholder.required && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {placeholder.description}
                  </p>
                  {placeholder.value ? (
                    <div className="text-sm text-green-700">
                      ✓ {placeholder.value}
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-700">
                      ⚠ TBD
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deviations */}
          {deviations.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deviations</h3>
              <div className="space-y-3">
                {deviations.map((deviation, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${getRiskColor(deviation.risk)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {deviation.type}
                      </span>
                      <div className="flex items-center">
                        {getRiskIcon(deviation.risk)}
                        <span className="text-xs ml-1 capitalize">
                          {deviation.risk} risk
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{deviation.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

