import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ArrowLeft, Save, Share2, History, CloudLightning } from 'lucide-react';

const DocumentEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [document, setDocument] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [socket, setSocket] = useState(null);

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState('viewer');
    const [isSharing, setIsSharing] = useState(false);

    const quillRef = useRef(null);
    const contentRef = useRef(content); // Store latest content to avoid dependency cycle in interval

    // Update ref whenever content changes
    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    // Determine permissions based on document fetched
    const isOwner = document?.owner?._id === user?._id;
    const userRole = isOwner ? 'owner'
        : document?.sharedWith?.find(s => s.userId._id === user?._id)?.role || 'viewer';
    const isReadOnly = userRole === 'viewer';

    // 1. Fetch Initial Document Data
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

    // 2. Setup Socket Connection & Real-time Listeners
    useEffect(() => {
        if (!document) return;

        // Connect to Socket server
        const s = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
        setSocket(s);

        // Join room
        s.emit('join-document', id);

        // Listen for incoming changes
        s.on('receive-changes', (incomingContent) => {
            setContent(incomingContent);
        });

        return () => {
            s.disconnect();
        };
    }, [document, id]);

    // 3. Periodic Auto-Save
    useEffect(() => {
        if (!socket || isReadOnly) return;

        const interval = setInterval(() => {
            // Emit the latest content from our ref to avoid stale closures
            socket.emit('save-document', {
                documentId: id,
                content: contentRef.current
            });
            console.log('Auto-saved to server via socket...');
        }, 5000); // Save every 5 seconds

        return () => {
            clearInterval(interval);
        };
    }, [socket, isReadOnly, id]);

    // Editor Change Handler
    const handleEditorChange = (newContent, delta, source, editor) => {
        if (source !== 'user') return; // Only process actual user typing

        setContent(newContent);

        // Broadcast changes immediately to others in room
        if (socket) {
            socket.emit('send-changes', { documentId: id, delta: newContent });
        }
    };

    const handleManualSave = async () => {
        if (isReadOnly) return;
        setIsSaving(true);
        try {
            await api.put(`/documents/${id}`, { content });
            // Notify via socket as backup
            socket?.emit('save-document', { documentId: id, content });
        } catch (err) {
            console.error('Failed to save document', err);
            alert('Error saving document');
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async (e) => {
        e.preventDefault();
        if (!shareEmail.trim()) return;

        setIsSharing(true);
        try {
            await api.post(`/documents/${id}/share`, { email: shareEmail, role: shareRole });
            alert(`Successfully shared with ${shareEmail} as ${shareRole}`);
            setShowShareModal(false);
            setShareEmail('');
            // Optionally fetch document again to update the sharing list if displayed
        } catch (err) {
            console.error('Failed to share document', err);
            alert(err.response?.data?.message || 'Error sharing document');
        } finally {
            setIsSharing(false);
        }
    };

    if (loading) return <div className="loader">Loading document...</div>;
    if (error) return <div className="auth-error" style={{ margin: '2rem' }}>{error}</div>;
    if (!document) return <div className="auth-error" style={{ margin: '2rem' }}>Document not found</div>;

    // React-Quill Toolbar Modules Config
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    };

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
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
                        {socket?.connected ? <><CloudLightning size={14} color="var(--secondary)" style={{ marginRight: '4px' }} /> Syncing Real-Time</> : 'Offline'}
                    </span>

                    {!isReadOnly && (
                        <button
                            onClick={handleManualSave}
                            className={`btn btn-primary ${isSaving ? 'saving' : ''}`}
                            disabled={isSaving}
                        >
                            <Save size={16} style={{ marginRight: '0.5rem' }} />
                            {isSaving ? 'Saving...' : 'Save Now'}
                        </button>
                    )}

                    {isOwner && (
                        <button
                            className="btn"
                            style={{ background: 'var(--surface)' }}
                            onClick={() => setShowShareModal(true)}
                        >
                            <Share2 size={16} style={{ marginRight: '0.5rem' }} /> Share
                        </button>
                    )}

                    <button className="btn" style={{ background: 'var(--surface)' }} title="Version History">
                        <History size={16} />
                    </button>
                </div>
            </header>

            {/* Editor Canvas Area */}
            <main className="editor-main" style={{ padding: '0' }}>
                <div className="editor-canvas" style={{ maxWidth: '100%', height: 'calc(100vh - 70px)' }}>
                    <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={content}
                        onChange={handleEditorChange}
                        modules={modules}
                        readOnly={isReadOnly}
                        placeholder={isReadOnly ? "This document is empty." : "Start typing here..."}
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    />
                </div>
            </main>

            {/* Share Document Modal */}
            {showShareModal && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content">
                        <div className="modal-header">
                            <h2>Share Document</h2>
                            <button className="btn-icon" onClick={() => setShowShareModal(false)}>
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleShare}>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <input
                                    type="email"
                                    placeholder="User's Email Address"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Permission Role
                                </label>
                                <select
                                    value={shareRole}
                                    onChange={(e) => setShareRole(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem 1rem',
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text-main)',
                                        fontFamily: 'inherit',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    <option value="viewer">Viewer (Read-only)</option>
                                    <option value="editor">Editor (Can edit)</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn" onClick={() => setShowShareModal(false)} style={{ background: 'transparent' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSharing || !shareEmail.trim()}>
                                    {isSharing ? 'Sharing...' : 'Share Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentEditor;
