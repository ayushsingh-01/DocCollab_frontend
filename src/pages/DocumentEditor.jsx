import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ArrowLeft, Save, Share2, History, CloudLightning, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

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

    // Version History State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [versions, setVersions] = useState([]);
    const [versionPage, setVersionPage] = useState(1);
    const [versionTotalPages, setVersionTotalPages] = useState(1);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

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

        // Cleanup on unmount (Back button or navigating away)
        return () => {
            // If user has edit rights, save state to backend before completely leaving room
            if (s.connected && !isReadOnly && contentRef.current) {
                console.log("Saving before disconnect...")
                s.emit('save-document', {
                    documentId: id,
                    content: contentRef.current,
                    savedBy: user?._id
                });
            }
            s.disconnect();
        };
    }, [document, id, isReadOnly, user?._id]);

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
            // Notify via socket as backup to spawn a version history item
            socket?.emit('save-document', { documentId: id, content, savedBy: user?._id });
            toast.success('Document saved explicitly');
        } catch (err) {
            console.error('Failed to save document', err);
            toast.error('Error saving document');
        } finally {
            setIsSaving(false);
        }
    };

    const goBack = () => {
        // Trigger save before navigating if not read only
        if (!isReadOnly && socket) {
            socket.emit('save-document', { documentId: id, content: contentRef.current, savedBy: user?._id });
        }
        navigate('/');
    };

    const handleShare = async (e) => {
        e.preventDefault();
        if (!shareEmail.trim()) return;

        setIsSharing(true);
        try {
            await api.post(`/documents/${id}/share`, { email: shareEmail, role: shareRole });
            toast.success(`Successfully shared with ${shareEmail} as ${shareRole}`);
            setShowShareModal(false);
            setShareEmail('');
            // Optionally fetch document again to update the sharing list if displayed
        } catch (err) {
            console.error('Failed to share document', err);
            toast.error(err.response?.data?.message || 'Error sharing document');
        } finally {
            setIsSharing(false);
        }
    };

    const fetchVersions = async (page = 1) => {
        setIsLoadingVersions(true);
        try {
            const { data } = await api.get(`/documents/${id}/versions?page=${page}&limit=5`);
            setVersions(data.versions);
            setVersionPage(data.currentPage);
            setVersionTotalPages(data.totalPages);
        } catch (err) {
            console.error('Failed to fetch versions', err);
            toast.error('Failed to load version history');
        } finally {
            setIsLoadingVersions(false);
        }
    };

    const handleOpenHistory = () => {
        setShowHistoryModal(true);
        fetchVersions(1);
    };

    const handleRestoreVersion = async (versionId) => {
        if (!window.confirm('Are you sure you want to restore this version? Current unsaved changes will be lost.')) return;
        setIsRestoring(true);
        try {
            const { data } = await api.post(`/documents/${id}/versions/${versionId}/restore`);
            setContent(data.document.content);
            if (socket) {
                socket.emit('send-changes', { documentId: id, delta: data.document.content });
            }
            toast.success('Document restored successfully!');
            setShowHistoryModal(false);
        } catch (error) {
            console.error('Failed to restore', error);
            toast.error('Failed to restore document version');
        } finally {
            setIsRestoring(false);
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
                    <button onClick={goBack} className="btn-icon" title="Back to Dashboard">
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

                    <button className="btn" style={{ background: 'var(--surface)' }} title="Version History" onClick={handleOpenHistory}>
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

            {/* Version History Modal */}
            {showHistoryModal && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Version History</h2>
                            <button className="btn-icon" onClick={() => setShowHistoryModal(false)}>
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
                            </button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' }}>
                            {isLoadingVersions ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading versions...</div>
                            ) : versions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No version history found.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {versions.map((ver) => (
                                        <div key={ver._id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                                    {new Date(ver.createdAt).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    Saved by: {ver.savedBy?.username || 'Unknown'}
                                                </div>
                                            </div>
                                            {!isReadOnly && (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                    onClick={() => handleRestoreVersion(ver._id)}
                                                    disabled={isRestoring}
                                                >
                                                    {isRestoring ? 'Restoring...' : 'Restore'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {versionTotalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-icon"
                                    disabled={versionPage === 1 || isLoadingVersions}
                                    onClick={() => fetchVersions(versionPage - 1)}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Page {versionPage} of {versionTotalPages}
                                </span>
                                <button
                                    className="btn btn-icon"
                                    disabled={versionPage === versionTotalPages || isLoadingVersions}
                                    onClick={() => fetchVersions(versionPage + 1)}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentEditor;
