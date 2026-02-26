import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, KeyRound } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Register = () => {
    // Step State: 1 = Email, 2 = OTP, 3 = Details
    const [step, setStep] = useState(1);

    // Form State
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/send-otp', { email });
            toast.success('OTP sent to your email!');
            setStep(2);
        } catch (err) {
            handleError(err, 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/verify-otp', { email, otp });
            toast.success('Email verified!');
            setStep(3);
        } catch (err) {
            handleError(err, 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await register(username, email, password);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err) {
            handleError(err, 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleError = (err, defaultMsg) => {
        if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
            const messages = err.response.data.errors.map(e => e.message).join(', ');
            setError(`Validation error: ${messages}`);
        } else {
            setError(err.response?.data?.message || defaultMsg);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <h1 className="auth-title">Join CollabDocs</h1>
                <p className="auth-subtitle">
                    {step === 1 && "Create an account to start collaborating"}
                    {step === 2 && `Enter the 6-digit code sent to ${email}`}
                    {step === 3 && "Complete your profile details"}
                </p>

                {error && <div className="auth-error">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleSendOTP} className="auth-form">
                        <div className="input-group">
                            <Mail className="input-icon" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="username"
                                autoFocus
                            />
                        </div>
                        <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
                            {isLoading ? 'Sending OTP...' : 'Continue'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP} className="auth-form">
                        <div className="input-group">
                            <KeyRound className="input-icon" />
                            <input
                                type="text"
                                placeholder="6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                pattern="[0-9]{6}"
                                title="Please enter exactly 6 digits"
                                autoFocus
                            />
                        </div>
                        <button type="submit" disabled={isLoading || otp.length !== 6} className="btn btn-primary btn-block">
                            {isLoading ? 'Verifying...' : 'Verify Email'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-block"
                            style={{ background: 'transparent', border: '1px solid var(--border)', marginTop: '-0.5rem' }}
                            onClick={() => setStep(1)}
                            disabled={isLoading}
                        >
                            Change Email
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleFinalRegister} className="auth-form">
                        <div className="input-group">
                            <UserIcon className="input-icon" />
                            <input
                                type="text"
                                placeholder="Choose a Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                                autoComplete="username"
                                autoFocus
                            />
                        </div>
                        <div className="input-group">
                            <Lock className="input-icon" />
                            <input
                                type="password"
                                placeholder="Create Password (min 6 chars)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
                            {isLoading ? 'Creating Account...' : 'Complete Registration'}
                        </button>
                    </form>
                )}

                <div className="auth-footer" style={{ marginTop: '2rem' }}>
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
