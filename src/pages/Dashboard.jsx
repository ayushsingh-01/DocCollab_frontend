import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { LogOut, FileText, Plus, Trash2, Edit3, X } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/documents');
            setDocuments(data);
        } catch (err) {
            setError('Failed to load documents');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDocument = async (e) => {
        e.preventDefault();
        if (!newDocTitle.trim()) return;

        setIsCreating(true);
        try {
            const { data } = await api.post('/documents', { title: newDocTitle });
            setShowModal(false);
            setNewDocTitle('');
            navigate(`/d/${data._id}`); // Navigate directly to the new document
        } catch (err) {
            console.error('Failed to create document', err);
            alert('Error creating document');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteDocument = async (e, id) => {
        e.stopPropagation(); // prevent navigation on card click
        if (window.confirm('Are you sure you want to delete this document?')) {
            try {
                await api.delete(`/documents/${id}`);
                setDocuments(documents.filter(doc => doc._id !== id));
            } catch (err) {
                if (err.response?.status === 403) {
                    alert("Only the owner can delete this document.");
                } else {
                    console.error('Failed to delete document', err);
                    alert('Error deleting document');
                }
            }
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>CollabDocs Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Welcome, {user?.username}</span>
                    <button onClick={logout} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                        <LogOut size={18} style={{ marginRight: '0.5rem' }} />
                        Logout
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Your Documents</h2>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    New Document
                </button>
            </div>

            {loading ? (
                <div className="loader">Loading documents...</div>
            ) : error ? (
                <div className="auth-error">{error}</div>
            ) : documents.length === 0 ? (
                <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                    <FileText size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>No documents yet</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Get started by creating your first document.</p>
                </div>
            ) : (
                <div className="grid-container">
                    {documents.map((doc) => {
                        const isOwner = doc.owner._id === user._id;
                        const role = isOwner ? 'Owner' : doc.sharedWith.find(s => s.userId === user._id)?.role || 'Viewer';

                        return (
                            <div key={doc._id} className="glass-card doc-card" onClick={() => navigate(`/d/${doc._id}`)}>
                                <div className="doc-card-header">
                                    <h3 className="doc-title"><FileText size={18} /> {doc.title}</h3>
                                    <div className={`role-badge ${isOwner ? 'owner' : role}`}>
                                        {role}
                                    </div>
                                </div>

                                <div className="doc-card-body">
                                    <p className="doc-meta">Created: {new Date(doc.createdAt).toLocaleDateString()}</p>
                                    <p className="doc-meta">Owner: {isOwner ? 'You' : doc.owner.username}</p>
                                </div>

                                <div className="doc-card-footer">
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', flex: 1 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/d/${doc._id}`);
                                        }}
                                    >
                                        <Edit3 size={16} style={{ marginRight: '0.4rem' }} /> Open Document
                                    </button>
                                    {isOwner && (
                                        <button
                                            className="btn-icon delete-btn"
                                            onClick={(e) => handleDeleteDocument(e, doc._id)}
                                            title="Delete document"
                                            style={{ padding: '0.55rem', borderRadius: '8px', marginLeft: '0.5rem' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Document Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content">
                        <div className="modal-header">
                            <h2>Create New Document</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateDocument}>
                            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="Document Title (e.g., Marketing Plan)"
                                    value={newDocTitle}
                                    onChange={(e) => setNewDocTitle(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: 'transparent' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isCreating || !newDocTitle.trim()}>
                                    {isCreating ? 'Creating...' : 'Create Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
