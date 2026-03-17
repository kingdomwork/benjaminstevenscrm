import React from 'react';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard({ leads, loading, updateLeadStatus }: { leads: any[], loading: boolean, updateLeadStatus: (id: string, status: string) => void }) {
  return (
    <>
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-start">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Setup Instructions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Deploy this app to Vercel.</li>
            <li>In Meta Developer Portal, configure Webhooks for "Leadgen" and point it to: <strong>{window.location.origin}/api/webhook/meta</strong></li>
            <li>Use the Verify Token specified in your environment variables.</li>
            <li>Ensure your Supabase table "leads" is created according to the schema.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Incoming Leads</h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {leads.length} Total
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualifying Answer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                    <p className="mt-2 text-gray-500">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No leads found. Waiting for incoming webhooks...
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      <br />
                      <span className="text-xs text-gray-400">{format(new Date(lead.created_at), 'h:mm a')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.first_name} {lead.last_name}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.campaign_name || '-'}</div>
                      <div className="text-xs text-gray-500">{lead.ad_set_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={lead.qualifying_answer}>
                        {lead.qualifying_answer || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${lead.status === 'qualified' ? 'bg-green-100 text-green-800' : 
                          lead.status === 'unqualified' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {lead.status === 'pending' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'qualified')}
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-full transition-colors"
                            title="Mark as Qualified"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateLeadStatus(lead.id, 'unqualified')}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                            title="Mark as Unqualified"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
