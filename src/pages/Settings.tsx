import React from 'react';
import { Settings as SettingsIcon, Shield, Database, Bell } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Database className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Meta Conversions API</h3>
              <p className="text-sm text-gray-500">Configure your connection to Meta Events Manager.</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pixel ID</label>
            <input type="text" disabled value="945883568016245" className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 sm:text-sm" />
            <p className="mt-1 text-xs text-gray-500">Configured via environment variables.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Access Token</label>
            <input type="password" disabled value="••••••••••••••••••••••••" className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Security</h3>
              <p className="text-sm text-gray-500">Manage your password and authentication.</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
