import React from 'react';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function Analytics({ leads }: { leads: any[] }) {
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
  const unqualifiedLeads = leads.filter(l => l.status === 'unqualified').length;
  const pendingLeads = leads.filter(l => l.status === 'pending').length;

  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalLeads}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Qualified Leads</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{qualifiedLeads}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Breakdown</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Qualified</span>
              <span className="font-medium text-gray-900">{qualifiedLeads}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium text-gray-900">{pendingLeads}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${totalLeads > 0 ? (pendingLeads / totalLeads) * 100 : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Unqualified</span>
              <span className="font-medium text-gray-900">{unqualifiedLeads}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${totalLeads > 0 ? (unqualifiedLeads / totalLeads) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
