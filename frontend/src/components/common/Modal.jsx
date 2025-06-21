import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, Heart, Sparkles } from 'lucide-react';

const Modal = ({
  isOpen = false,
  onClose = () => {},
  title = '',
  children,
  size = 'md',
  type = 'default',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  actions = null,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && closeOnEscape && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-md';
      case 'md': return 'max-w-lg';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      case 'full': return 'max-w-full mx-4';
      default: return 'max-w-lg';
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-400',
          borderColor: 'border-green-500/30',
          bgGradient: 'from-green-500/10 to-emerald-500/10'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
          borderColor: 'border-yellow-500/30',
          bgGradient: 'from-yellow-500/10 to-orange-500/10'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-400',
          borderColor: 'border-red-500/30',
          bgGradient: 'from-red-500/10 to-pink-500/10'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          bgGradient: 'from-blue-500/10 to-cyan-500/10'
        };
      case 'apex':
        return {
          icon: Heart,
          iconColor: 'text-pink-400',
          borderColor: 'border-pink-500/30',
          bgGradient: 'from-pink-500/10 to-purple-500/10'
        };
      default:
        return {
          icon: null,
          iconColor: '',
          borderColor: 'border-white/20',
          bgGradient: ''
        };
    }
  };

  if (!isVisible) return null;

  const typeStyles = getTypeStyles();
  const TypeIcon = typeStyles.icon;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Modal */}
      <div 
        className={`relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border ${typeStyles.borderColor} w-full ${getSizeClasses()} transform transition-all duration-300 ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${className}`}
      >
        
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between p-6 border-b border-white/10 ${
            typeStyles.bgGradient ? `bg-gradient-to-r ${typeStyles.bgGradient}` : ''
          }`}>
            <div className="flex items-center space-x-3">
              {TypeIcon && (
                <div className="p-2 rounded-xl bg-white/10">
                  <TypeIcon className={`w-6 h-6 ${typeStyles.iconColor}`} />
                </div>
              )}
              {title && (
                <h2 className="text-xl font-semibold text-white">{title}</h2>
              )}
            </div>
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// Confirmation Modal
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type={type}
      size="sm"
      actions={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-gray-300 leading-relaxed">{message}</p>
    </Modal>
  );
};

// Success Modal
const SuccessModal = ({
  isOpen,
  onClose,
  title = 'Success!',
  message = 'Action completed successfully.',
  buttonText = 'Continue'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type="success"
      size="sm"
      actions={
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300"
        >
          {buttonText}
        </button>
      }
    >
      <p className="text-gray-300 leading-relaxed">{message}</p>
    </Modal>
  );
};

// Error Modal
const ErrorModal = ({
  isOpen,
  onClose,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  buttonText = 'Try Again'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type="error"
      size="sm"
      actions={
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300"
        >
          {buttonText}
        </button>
      }
    >
      <p className="text-gray-300 leading-relaxed">{message}</p>
    </Modal>
  );
};

// ApexMatch Themed Modal
const ApexModal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type="apex"
      size={size}
      actions={actions}
      className="relative overflow-hidden"
    >
      {/* ApexMatch Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </Modal>
  );
};

// Loading Modal
const LoadingModal = ({
  isOpen,
  message = 'Processing...',
  submessage = ''
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot close loading modal
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      size="sm"
    >
      <div className="text-center py-8">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-purple-500 mx-auto"></div>
          <Heart className="w-6 h-6 text-pink-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
        {submessage && (
          <p className="text-gray-300 text-sm">{submessage}</p>
        )}
      </div>
    </Modal>
  );
};

export default Modal;
export { 
  ConfirmModal, 
  SuccessModal, 
  ErrorModal, 
  ApexModal, 
  LoadingModal 
};