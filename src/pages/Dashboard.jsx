import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, FileText } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>CollabDocs Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Welcome, {user?.username} ({user?.role})</span>
                    <button onClick={logout} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                        <LogOut size={18} style={{ marginRight: '0.5rem' }} />
                        Logout
                    </button>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <FileText size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h2>Welcome to your Workspace</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Real-time collaborative document editing is just a click away.
                </p>
                <button className="btn btn-primary" style={{ marginTop: '2rem' }}>
                    + New Document
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
