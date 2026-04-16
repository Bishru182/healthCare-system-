import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_NOTIFICATION_API || '/api/notifications/logs';

// ─── Badge colour helpers ─────────────────────
const statusClasses = {
  sent: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

const channelIcon = {
  email: '📧',
  sms: '📱',
};

export default function NotificationDashboard() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Fetch logs ────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(API_URL);
      setLogs(data.logs ?? []);
    } catch (err) {
      console.error(err);
      setError('Failed to load notification logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Render ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Notification Logs
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Audit trail of every email &amp; SMS dispatched by the platform.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : (
              '🔄'
            )}
            Refresh Logs
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <svg
                className="mr-3 h-5 w-5 animate-spin text-indigo-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              No notification logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date / Time', 'Event Type', 'Recipient', 'Channel', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                      {/* Date / Time */}
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      {/* Event Type */}
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {log.eventType}
                      </td>

                      {/* Recipient */}
                      <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                        {log.recipient}
                      </td>

                      {/* Channel */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {channelIcon[log.channel] ?? '🔔'} {log.channel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            statusClasses[log.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                          title={log.errorMessage || ''}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && logs.length > 0 && (
          <p className="mt-4 text-right text-xs text-gray-400">
            Showing {logs.length} most recent log{logs.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
