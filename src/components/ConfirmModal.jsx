import React from 'react';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger', loading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content modal-${type}`}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="modal-btn modal-cancel" 
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`modal-btn modal-confirm modal-btn-${type}`} 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
