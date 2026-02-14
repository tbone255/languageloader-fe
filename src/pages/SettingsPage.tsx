/**
 * SettingsPage
 *
 * User preferences and data management.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { srsItemService } from '../services/srsItemService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetProgress = () => {
    // Clear all localStorage data
    localStorage.clear();

    // Clear SRS service state
    srsItemService.clear();

    // Close modal and redirect to learn page
    setShowConfirm(false);
    navigate('/learn');

    // Reload page to reset all state
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Settings</h1>
      <p className="text-base-content/70 mb-8">Manage your preferences and data</p>

      {/* Data Management Section */}
      <div className="card bg-base-100 shadow-lg mb-6">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Data Management</h2>

          <div className="space-y-4">
            {/* Reset Progress */}
            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-semibold mb-1">Reset All Progress</h3>
                <p className="text-sm text-base-content/70">
                  Clear all lesson progress and SRS cards. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="btn btn-error btn-outline"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Reset All Progress?</h3>
            <p className="mb-4">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside mb-6 space-y-1">
              <li>All lesson completion progress</li>
              <li>All SRS cards and their review history</li>
              <li>All exercise completions</li>
            </ul>
            <p className="text-error font-semibold mb-6">
              This action cannot be undone.
            </p>
            <div className="modal-action">
              <button onClick={() => setShowConfirm(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={handleResetProgress} className="btn btn-error">
                Reset Everything
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)}></div>
        </div>
      )}
    </div>
  );
}

