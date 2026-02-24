import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { ArrowLeft, Save, Share2, History, Trash } from 'lucide-react';

const DocumentEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [document, setDocument] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Determine permissions based on document fetched
    const isOwner = document?.owner?._id === user?._id;
    const userRole = isOwner ? 'owner'
        : document?.sharedWith?.find(s => s.userId._id === user?._id)?.role || 'viewer';
    const isReadOnly = userRole === 'viewer';

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/documents/${id}`);
                setDocument(data);
                setContent(data.content || '');
            } catch (err) {
                console.error('Failed to fetch document', err);
                setError(err.response?.data?.message || 'Error loading document');
            } finally {
                setLoading(false);
            }
        };

        fetchDocument();
    }, [id]);

    const handleSave = async () => {
        if (isReadOnly) return;

        setIsSaving(true);
        try {
            await api.put(`/documents/${id}`, { content });
            // Temporary toast/notification implementation
            console.log('Saved successfully');
        } catch (err) {
            console.error('Failed to save document', err);
            alert('Error saving document');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="loader">Loading document...</div>;
    if (error) return <div className="auth-error" style={{ margin: '2rem' }}>{error}</div>;
    if (!document) return <div className="auth-error" style={{ margin: '2rem' }}>Document not found</div>;

    return (
        <div className="editor-layout">
            {/* Editor Top Bar */}
            <header className="editor-header glass-card">
                <div className="editor-header-left">
                    <button onClick={() => navigate('/')} className="btn-icon" title="Back to Dashboard">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="editor-title-container">
                        <h2>{document.title}</h2>
                        <span className={`role-badge ${userRole}`}>{userRole}</span>
                    </div>
                </div>

                <div className="editor-header-right">
                    {!isReadOnly && (
                        <button
                            onClick={handleSave}
                            className={`btn btn-primary ${isSaving ? 'saving' : ''}`}
                            disabled={isSaving}
                        >
                            <Save size={16} style={{ marginRight: '0.5rem' }} />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    )}

                    {isOwner && (
                        <button className="btn" style={{ background: 'var(--surface)' }}>
                            <Share2 size={16} style={{ marginRight: '0.5rem' }} /> Share
                        </button>
                    )}

                    <button className="btn" style={{ background: 'var(--surface)' }} title="Version History">
                        <History size={16} />
                    </button>
                </div>
            </header>

            {/* Editor Canvas Area */}
            <main className="editor-main">
                <div className="editor-canvas glass-card">
                    <textarea
                        className="editor-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isReadOnly}
                        placeholder={isReadOnly ? "This document is empty." : "Start typing your document here..."}
                    />
                </div>
            </main>
        </div>
    );
};

export default DocumentEditor;
