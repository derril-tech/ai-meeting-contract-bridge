'use client';

import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface QAChatProps {
    draftId: string;
    onQuestionAsked?: () => void;
}

interface QAPair {
    id: string;
    question: string;
    answer: string;
    confidence: number;
    citations: Array<{
        clauseIds?: string[];
        meetingSpans?: Array<{
            start: number;
            end: number;
            text: string;
        }>;
        sources?: string[];
    }>;
    createdAt: string;
}

export function QAChat({ draftId, onQuestionAsked }: QAChatProps) {
    const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            fetchQAPairs();
        }
    }, [isOpen, draftId]);

    useEffect(() => {
        scrollToBottom();
    }, [qaPairs]);

    const fetchQAPairs = async () => {
        try {
            const response = await fetch(`/api/drafts/${draftId}/qa`);
            if (!response.ok) {
                throw new Error('Failed to fetch Q&A pairs');
            }
            const data = await response.json();
            setQaPairs(data.qaPairs || []);
        } catch (error) {
            console.error('Error fetching Q&A pairs:', error);
            toast.error('Failed to load Q&A history');
        }
    };

    const handleAskQuestion = async () => {
        if (!question.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/drafts/${draftId}/qa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get answer');
            }

            const result = await response.json();

            // Add the new Q&A pair to the list
            const newQAPair: QAPair = {
                id: result.id,
                question: question.trim(),
                answer: result.answer,
                confidence: result.confidence,
                citations: result.citations,
                createdAt: new Date().toISOString(),
            };

            setQaPairs(prev => [...prev, newQAPair]);
            setQuestion('');
            onQuestionAsked?.();

            toast.success('Question answered successfully');

        } catch (error) {
            console.error('Error asking question:', error);
            toast.error('Failed to get answer');
        } finally {
            setIsLoading(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 0.8) return 'High';
        if (confidence >= 0.6) return 'Medium';
        return 'Low';
    };

    return (
        <div className="relative">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-200 ${isOpen
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                title={isOpen ? 'Close Q&A' : 'Open Q&A'}
            >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-6 w-96 h-96 bg-white rounded-lg shadow-xl border flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                        <h3 className="text-lg font-semibold text-gray-900">Contract Q&A</h3>
                        <p className="text-sm text-gray-600">
                            Ask questions about your contract draft
                        </p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {qaPairs.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">No questions asked yet</p>
                                <p className="text-xs mt-1">Try asking "Why is this clause important?"</p>
                            </div>
                        ) : (
                            qaPairs.map((pair) => (
                                <div key={pair.id} className="space-y-3">
                                    {/* Question */}
                                    <div className="flex justify-end">
                                        <div className="bg-blue-600 text-white rounded-lg px-3 py-2 max-w-xs">
                                            <p className="text-sm">{pair.question}</p>
                                        </div>
                                    </div>

                                    {/* Answer */}
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-xs">
                                            <p className="text-sm text-gray-900 mb-2">{pair.answer}</p>

                                            {/* Confidence and Citations */}
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span className={getConfidenceColor(pair.confidence)}>
                                                    {getConfidenceLabel(pair.confidence)} confidence
                                                </span>
                                                {pair.citations && (
                                                    <span>
                                                        {pair.citations.clauseIds?.length || 0} citations
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-lg px-3 py-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                        <span className="text-sm text-gray-600">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !isLoading) {
                                        handleAskQuestion();
                                    }
                                }}
                                placeholder="Ask a question about your contract..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleAskQuestion}
                                disabled={!question.trim() || isLoading}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
