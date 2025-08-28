'use client';

import { useState } from 'react';
import {
    DocumentTextIcon,
    DocumentIcon,
    CodeBracketIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ExportWizardProps {
    draftId: string;
    isOpen: boolean;
    onClose: () => void;
    onExportComplete?: () => void;
}

interface ExportOption {
    format: 'docx' | 'pdf' | 'markdown' | 'json';
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    fileExtension: string;
}

const exportOptions: ExportOption[] = [
    {
        format: 'docx',
        label: 'Word Document',
        description: 'Professional document format with formatting',
        icon: DocumentTextIcon,
        fileExtension: '.docx',
    },
    {
        format: 'pdf',
        label: 'PDF Document',
        description: 'Portable format for sharing and printing',
        icon: DocumentIcon,
        fileExtension: '.pdf',
    },
    {
        format: 'markdown',
        label: 'Markdown',
        description: 'Text format for version control and editing',
        icon: CodeBracketIcon,
        fileExtension: '.md',
    },
    {
        format: 'json',
        label: 'JSON Data',
        description: 'Structured data with decisions and clauses',
        icon: CodeBracketIcon,
        fileExtension: '.json',
    },
];

export function ExportWizard({ draftId, isOpen, onClose, onExportComplete }: ExportWizardProps) {
    const [selectedFormat, setSelectedFormat] = useState<ExportOption | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<string>('');

    const handleExport = async () => {
        if (!selectedFormat) return;

        setIsExporting(true);
        setExportProgress('Starting export...');

        try {
            setExportProgress('Preparing document...');

            const response = await fetch(`/api/drafts/${draftId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format: selectedFormat.format,
                }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const result = await response.json();

            setExportProgress('Download starting...');

            // Trigger download
            const downloadResponse = await fetch(result.downloadUrl);
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `contract-draft${selectedFormat.fileExtension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success(`${selectedFormat.label} exported successfully`);
            onExportComplete?.();
            onClose();

        } catch (error) {
            console.error('Export error:', error);
            toast.error('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Export Contract</h2>
                        <p className="text-sm text-gray-600">Choose your preferred format</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isExporting ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Exporting...
                            </h3>
                            <p className="text-sm text-gray-600">{exportProgress}</p>
                        </div>
                    ) : (
                        <>
                            {/* Format Selection */}
                            <div className="space-y-3 mb-6">
                                {exportOptions.map((option) => {
                                    const IconComponent = option.icon;
                                    return (
                                        <div
                                            key={option.format}
                                            onClick={() => setSelectedFormat(option)}
                                            className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedFormat?.format === option.format
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <IconComponent className="w-6 h-6 text-gray-600" />
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900">
                                                        {option.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {option.description}
                                                    </p>
                                                </div>
                                                {selectedFormat?.format === option.format && (
                                                    <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legal Notice */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                    Important Legal Notice
                                </h4>
                                <p className="text-xs text-yellow-700">
                                    All exported documents will include a watermark stating:
                                    <br />
                                    <em>"Not legally binding until reviewed by counsel."</em>
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={!selectedFormat}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    <span>Export</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
