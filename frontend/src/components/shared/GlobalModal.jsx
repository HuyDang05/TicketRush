import React, { useEffect } from 'react';
import useModalStore from '../../store/modalStore';
import './GlobalModal.css';

const IconWrapper = ({ type }) => {
  switch (type) {
    case 'success':
      return (
        <div className="global-modal-icon global-modal-icon--success">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'warning':
      return (
        <div className="global-modal-icon global-modal-icon--warning">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="global-modal-icon global-modal-icon--error">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case 'info':
    default:
      return (
        <div className="global-modal-icon global-modal-icon--info">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
};

const GlobalModal = () => {
  const { isOpen, props, closeModal } = useModalStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleConfirm = async () => {
    if (props.onConfirm) {
      // Allow async functions to complete before closing if needed,
      // but typically we wait for the action then close.
      await props.onConfirm();
    }
    closeModal();
  };

  const handleCancel = () => {
    if (props.onCancel) {
      props.onCancel();
    }
    closeModal();
  };

  return (
    <div className="global-modal-overlay" onClick={handleOverlayClick}>
      <div className="global-modal-box" style={{ width: props.width }}>
        {!props.hideCloseButton && (
          <button className="global-modal-close" onClick={closeModal} aria-label="Close">
            ✕
          </button>
        )}

        {props.title && (
          <div className="global-modal-header">
            {props.type !== 'custom' && <IconWrapper type={props.type} />}
            <h2 className="global-modal-title">{props.title}</h2>
          </div>
        )}

        <div className="global-modal-content">
          {props.content}
        </div>

        {props.customActions ? (
          <div className="global-modal-actions">
            {props.customActions}
          </div>
        ) : (
          <div className="global-modal-actions">
            {props.showCancel && (
              <button 
                className="global-modal-btn global-modal-btn--cancel" 
                onClick={handleCancel}
              >
                {props.cancelText}
              </button>
            )}
            <button 
              className={`global-modal-btn global-modal-btn--confirm ${props.type}`} 
              onClick={handleConfirm}
            >
              {props.confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalModal;
