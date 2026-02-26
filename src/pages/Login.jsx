import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            // Handle specifically formatted Zod validation errors from backend
            if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
                const messages = err.response.data.errors.map(e => e.message).join(', ');
                setError(`Validation error: ${messages}`);
            } else {
                setError(err.response?.data?.message || 'Invalid credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to CollabDocs</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <Mail className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="input-group">
                        <Lock className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
                        {isLoading ? 'Signing In...' : 'Login'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
