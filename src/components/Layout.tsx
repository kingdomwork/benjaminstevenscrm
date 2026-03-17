import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Settings, BarChart3, FileText, Loader2 } from 'lucide-react';

export default function Layout({ 
  handleLogout, 
  generateReport, 
  generatingReport 
}: { 
  handleLogout: () => void, 
  generateReport: () => void, 
  generatingReport: boolean 
}) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-5 h-5 mr-3" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Benjamin Stevens</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {generatingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Generate Report
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
