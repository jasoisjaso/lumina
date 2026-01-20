import React, { useState, useEffect } from 'react';
import calendarSharingAPI, { FamilyMember, SharingSettings } from '../api/calendar-sharing.api';

/**
 * Calendar Sharing Settings Component
 * Allows users to control who can view/edit their calendar
 */

interface SharingEntry {
  userId: number;
  userName: string;
  canView: boolean;
  canEdit: boolean;
}

export const CalendarSharingSettings: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [sharingSettings, setSharingSettings] = useState<SharingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [members, settings] = await Promise.all([
        calendarSharingAPI.getFamilyMembers(),
        calendarSharingAPI.getMySettings(),
      ]);

      setFamilyMembers(members);

      // Merge settings with family members to get complete list
      const settingsMap = new Map(settings.sharedWith.map(s => [s.userId, s]));
      const merged = members.map(member => {
        const existing = settingsMap.get(member.id);
        return {
          userId: member.id,
          userName: member.name,
          canView: existing?.canView || false,
          canEdit: existing?.canEdit || false,
        };
      });

      setSharingSettings(merged);
    } catch (err: any) {
      console.error('Failed to load calendar sharing data:', err);
      setError(err.response?.data?.message || 'Failed to load sharing settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleView = (userId: number) => {
    setSharingSettings(prev =>
      prev.map(entry =>
        entry.userId === userId
          ? { ...entry, canView: !entry.canView, canEdit: entry.canView ? false : entry.canEdit }
          : entry
      )
    );
  };

  const handleToggleEdit = (userId: number) => {
    setSharingSettings(prev =>
      prev.map(entry =>
        entry.userId === userId
          ? { ...entry, canEdit: !entry.canEdit, canView: !entry.canEdit ? true : entry.canView }
          : entry
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Only send entries where sharing is enabled
      const activeSharingSettings = sharingSettings
        .filter(s => s.canView || s.canEdit)
        .map(s => ({
          userId: s.userId,
          canView: s.canView,
          canEdit: s.canEdit,
        }));

      await calendarSharingAPI.updateAllSettings(activeSharingSettings);

      setSuccessMessage('Sharing settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save sharing settings:', err);
      setError(err.response?.data?.message || 'Failed to save sharing settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Calendar Sharing</h2>
        <p className="text-slate-600">
          Control who can see your calendar events. You can grant view or edit permissions to family members.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-emerald-800">{successMessage}</p>
        </div>
      )}

      {/* Family Members List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {familyMembers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No family members yet</h3>
            <p className="text-slate-600">Invite family members to start sharing your calendar with them.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sharingSettings.map((entry) => {
              const member = familyMembers.find(m => m.id === entry.userId);
              if (!member) return null;

              return (
                <div key={entry.userId} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    {/* Member Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate">{member.name}</h3>
                        <p className="text-sm text-slate-600 truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      {/* Can View Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={entry.canView}
                          onChange={() => handleToggleView(entry.userId)}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${entry.canView ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform transform ${entry.canView ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Can View</span>
                      </label>

                      {/* Can Edit Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={entry.canEdit}
                          onChange={() => handleToggleEdit(entry.userId)}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${entry.canEdit ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform transform ${entry.canEdit ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Can Edit</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Button */}
      {familyMembers.length > 0 && (
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => loadData()}
            className="px-6 py-2.5 text-slate-700 font-medium hover:text-slate-900 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          How Calendar Sharing Works
        </h4>
        <ul className="space-y-1 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 mt-0.5">•</span>
            <span><strong>Can View:</strong> Family members can see your calendar events but cannot make changes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">•</span>
            <span><strong>Can Edit:</strong> Family members can create, modify, and delete events on your calendar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">•</span>
            <span>Enabling "Can Edit" automatically enables "Can View"</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarSharingSettings;
