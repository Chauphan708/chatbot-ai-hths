/**
 * UI Components — GlassCard, Button, Input, Modal, Badge, Spinner, Toast
 */

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, useEffect, useState } from "react";
import { X } from "lucide-react";
import "./ui.css";

// ─── GlassCard ────────────────────────────────────────

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  animate?: boolean;
  style?: React.CSSProperties;
}

export function GlassCard({
  children,
  className = "",
  padding = "md",
  hover = false,
  animate = true,
  style,
}: GlassCardProps) {
  return (
    <div
      className={`glass-card glass-card--${padding} ${hover ? "glass-card--hover" : ""} ${animate ? "animate-fade-in" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${fullWidth ? "btn--full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn__spinner" />
      ) : icon ? (
        <span className="btn__icon">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({
  label,
  error,
  icon,
  className = "",
  id,
  ...props
}: InputFieldProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`input-group ${error ? "input-group--error" : ""} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-group__label">
          {label}
        </label>
      )}
      <div className="input-group__wrapper">
        {icon && <span className="input-group__icon">{icon}</span>}
        <input
          id={inputId}
          className={`input-group__input ${icon ? "input-group__input--with-icon" : ""}`}
          {...props}
        />
      </div>
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────

interface TextareaProps {
  label?: string;
  error?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}

export function Textarea({
  label,
  error,
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
  id,
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`input-group ${error ? "input-group--error" : ""} ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="input-group__label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className="input-group__textarea"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal modal--${size} animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal__header">
            <h3 className="modal__title">{title}</h3>
            <button
              className="modal__close"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span className={`badge badge--${variant} ${className}`}>{children}</span>
  );
}

// ─── Spinner ──────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return <div className={`spinner spinner--${size} ${className}`} />;
}

// ─── Toast System ─────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: Array<(toast: ToastData) => void> = [];

export function showToast(message: string, type: ToastType = "info") {
  const toast: ToastData = { id: Date.now().toString(), message, type };
  toastListeners.forEach((listener) => listener(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type} animate-slide-up`}
        >
          <span>{toast.message}</span>
          <button
            className="toast__close"
            onClick={() =>
              setToasts((prev) => prev.filter((t) => t.id !== toast.id))
            }
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
