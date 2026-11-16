import React, { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import * as api from '../services/api';

interface AuthScreenProps {
    onLoginSuccess: (email: string) => void;
    authRequiredNotice?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, authRequiredNotice }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSent, setForgotSent] = useState(false);

    const isValidEmail = (val: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    };

    // Check if email is invalid when touched, or if empty and touched
    const showEmailError = emailTouched && !isValidEmail(email);

    // Live confirmation validation in register mode
    const showConfirmMismatch =
        mode === 'register' &&
        (confirmPassword.length > 0 || confirmTouched) &&
        confirmPassword !== password;
    const passwordsMatch =
        mode === 'register' &&
        confirmPassword.length > 0 &&
        confirmPassword === password;
    const isRegisterSubmitDisabled =
        mode === 'register' && (!confirmPassword || confirmPassword !== password);

    const switchMode = (nextMode: 'login' | 'register') => {
        setMode(nextMode);
        setFormError(null);
        setEmailTouched(false);
        setConfirmPassword('');
        setConfirmTouched(false);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailTouched(true);
        setFormError(null);

        if (!isValidEmail(email)) {
            return;
        }

        if (!password) {
            return;
        }

        if (mode === 'register') {
            setConfirmTouched(true);
            if (!name.trim()) {
                setFormError('Escribe el nombre de tu familia o el tuyo.');
                return;
            }
            if (password.length < 8) {
                setFormError('La contraseña debe tener al menos 8 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                return;
            }
        }

        setIsLoading(true);
        try {
            // Autenticación real contra el backend en C# (JWT). Ya no se acepta cualquier usuario.
            const user =
                mode === 'register'
                    ? await api.register(name.trim(), email.trim(), password)
                    : await api.login(email.trim(), password);
            onLoginSuccess(user.email);
        } catch (err) {
            setFormError(
                err instanceof api.ApiError ? err.message : 'No se pudo completar la solicitud. Intenta de nuevo.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex flex-col items-center justify-center px-4 pt-8 pb-24 sm:py-12 bg-[#FFF0F3] dark:bg-[#121417] text-slate-800 dark:text-zinc-100 relative overflow-x-hidden overflow-y-auto transition-colors"
            style={{
                backgroundImage: 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
            }}
        >

            {/* Alert if user tried to navigate without logging in */}
            {authRequiredNotice && (
                <div className="mb-4 z-20 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div
                        className="bg-white/95 dark:bg-[#1E2228] backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border text-xs font-semibold flex items-center gap-2"
                        style={{
                            borderColor: 'var(--color-accent-soft)',
                            color: 'var(--color-accent)'
                        }}
                    >
                        <AlertCircle className="w-4 h-4" />
                        <span>{authRequiredNotice}</span>
                    </div>
                </div>
            )}

            {/* Main Floating Auth Card */}
            <div className="my-auto w-full max-w-[430px] bg-white dark:bg-[#1E2228] rounded-3xl p-6 sm:p-10 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white dark:border-zinc-800/80 relative z-10 animate-in fade-in zoom-in-95 duration-300">

                {/* Animated Toggle Switch Pill */}
                <div className="flex justify-center mb-8">
                    <div className="bg-[#EDEDF2] dark:bg-[#282D35] p-1.5 rounded-full flex items-center relative w-full max-w-[340px] border border-transparent dark:border-zinc-700">
                        {/* Iniciar Sesión Pill */}
                        <button
                            id="auth-toggle-login"
                            type="button"
                            onClick={() => switchMode('login')}
                            style={
                                mode === 'login'
                                    ? { backgroundColor: 'var(--color-accent)' }
                                    : undefined
                            }
                            className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 z-10 cursor-pointer ${mode === 'login'
                                    ? 'text-white shadow-md'
                                    : 'text-[#7e889b] dark:bg-transparent dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            <span>Iniciar Sesión</span>
                            {/* White switch circle knob matching mockup screenshot */}
                            {mode === 'login' && (
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm inline-block flex-shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                            )}
                        </button>

                        {/* Registrarme Pill */}
                        <button
                            id="auth-toggle-register"
                            type="button"
                            onClick={() => switchMode('register')}
                            style={
                                mode === 'register'
                                    ? { backgroundColor: 'var(--color-accent)' }
                                    : undefined
                            }
                            className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 z-10 cursor-pointer ${mode === 'register'
                                    ? 'text-white shadow-md'
                                    : 'text-[#7e889b] dark:bg-transparent dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            {mode === 'register' && (
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm inline-block flex-shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                            )}
                            <span>Registrarme</span>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1 ml-1">
                                Nombre o Familia
                            </label>
                            <input
                                id="auth-input-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Familia Palacio"
                                className="w-full px-4 py-3 bg-white dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent text-sm transition-all"
                                required
                            />
                        </div>
                    )}

                    {/* Email Input Field */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1.5 ml-1">
                            Email
                        </label>
                        <div className="relative">
                            <input
                                id="auth-input-email"
                                type="email"
                                value={email}
                                onFocus={() => setEmailTouched(true)}
                                onBlur={() => setEmailTouched(true)}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailTouched(true);
                                }}
                                placeholder="Email"
                                style={
                                    showEmailError
                                        ? { borderColor: 'var(--color-accent)' }
                                        : undefined
                                }
                                className={`w-full px-4 py-3 bg-white dark:bg-[#282D35] text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 rounded-2xl text-sm focus:outline-none transition-all ${showEmailError
                                        ? 'border ring-1 ring-accent bg-accent-light'
                                        : 'border border-rose-200 dark:border-zinc-700 focus:border-accent focus:ring-2 focus:ring-accent-soft'
                                    }`}
                                required
                            />
                        </div>
                        {showEmailError && (
                            <p
                                className="text-[11px] mt-1.5 ml-1 font-medium animate-in fade-in"
                                style={{ color: 'var(--color-accent)' }}
                            >
                                Por favor ingrese un email válido.
                            </p>
                        )}
                    </div>

                    {/* Password Input Field with toggle button in soft pastel design */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1.5 ml-1">
                            Contraseña
                        </label>
                        <div className="relative flex items-center">
                            <input
                                id="auth-input-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                className="w-full pl-4 pr-11 py-3 bg-white dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent text-sm transition-all"
                                required
                            />
                            <button
                                id="auth-toggle-password-btn"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors p-1 focus:outline-none cursor-pointer"
                                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {/* Icono Ojo Abierto (Cuando está visible) */}
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                ) : (
                                    /* Icono Ojo Tachado (Cuando está oculta) */
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {mode === 'register' && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 ml-1">
                                Mínimo 8 caracteres
                            </p>
                        )}
                    </div>

                    {/* Confirm Password Input Field (Register mode only) */}
                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1.5 ml-1">
                                Confirmar contraseña
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    id="auth-input-confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onBlur={() => {
                                        if (confirmPassword.length > 0) setConfirmTouched(true);
                                    }}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (e.target.value.length > 0) setConfirmTouched(true);
                                    }}
                                    placeholder="Confirmar contraseña"
                                    style={
                                        showConfirmMismatch
                                            ? { borderColor: 'var(--color-accent)' }
                                            : undefined
                                    }
                                    className={`w-full pl-4 pr-11 py-3 bg-white dark:bg-[#282D35] text-gray-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 rounded-2xl text-sm focus:outline-none transition-all ${showConfirmMismatch
                                            ? 'border ring-1 ring-accent bg-accent-light'
                                            : 'border border-rose-200 dark:border-zinc-700 focus:border-accent focus:ring-2 focus:ring-accent-soft'
                                        }`}
                                    required
                                />
                                <button
                                    id="auth-toggle-confirm-password-btn"
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors p-1 focus:outline-none cursor-pointer"
                                    title={showConfirmPassword ? 'Ocultar confirmación' : 'Ver confirmación'}
                                    aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Ver confirmación de contraseña'}
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {showConfirmMismatch && (
                                <p
                                    className="text-[11px] mt-1.5 ml-1 font-medium animate-in fade-in"
                                    style={{ color: 'var(--color-accent)' }}
                                >
                                    Las contraseñas no coinciden.
                                </p>
                            )}
                            {passwordsMatch && (
                                <p className="text-[11px] mt-1.5 ml-1 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Las contraseñas coinciden.</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Forgot Password Link (Login mode only) */}
                    {mode === 'login' && (
                        <div className="flex justify-end pt-0.5">
                            <button
                                id="auth-forgot-password-link"
                                type="button"
                                onClick={() => setShowForgotModal(true)}
                                className="text-xs font-medium text-gray-700 dark:text-zinc-200 hover:underline transition-colors cursor-pointer"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    {formError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300"
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Big Action Pill Button with dynamic background */}
                    <button
                        id="auth-submit-btn"
                        type="submit"
                        disabled={isLoading || isRegisterSubmitDisabled}
                        style={{
                            backgroundColor: 'var(--color-accent)',
                            borderColor: 'var(--color-accent-soft)'
                        }}
                        className="w-full py-3.5 px-6 rounded-full active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none text-white font-bold text-sm sm:text-base shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-4"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                        )}
                    </button>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div
                        className="bg-white dark:bg-[#1E2228] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-rose-100 dark:border-zinc-800/80 text-gray-800 dark:text-zinc-100"
                    >
                        <h3 className="text-lg font-bold mb-2">Recuperar Contraseña</h3>
                        <p className="text-xs text-gray-600 dark:text-zinc-300 mb-4">
                            Ingresa el correo registrado para enviarte un enlace seguro con token de recuperación.
                        </p>
                        {forgotSent ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl text-center space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                    ¡Enlace enviado con éxito!
                                </p>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                    Revisa tu bandeja de entrada o spam.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowForgotModal(false);
                                        setForgotSent(false);
                                    }}
                                    className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-medium cursor-pointer"
                                >
                                    Entendido
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="tu-correo@ejemplo.com"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-[#282D35] border border-rose-200 dark:border-zinc-700 rounded-2xl text-xs text-gray-800 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(false)}
                                        className="flex-1 py-2 rounded-full border border-slate-200 dark:border-zinc-700 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isValidEmail(forgotEmail || email)) {
                                                setForgotSent(true);
                                            }
                                        }}
                                        style={{
                                            backgroundColor: 'var(--color-accent)',
                                            borderColor: 'var(--color-accent-soft)'
                                        }}
                                        className="flex-1 py-2 rounded-full text-white text-xs font-bold shadow-md cursor-pointer"
                                    >
                                        Enviar Enlace
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
