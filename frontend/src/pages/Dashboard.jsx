import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Stat = ({ label, value, accent }) => (
  <div className="card">
    <div className="text-sm text-slate-500">{label}</div>
    <div className={`text-3xl font-bold mt-1 ${accent || 'text-slate-900'}`}>{value}</div>
  </div>
);

const isOverdue = (task) =>
  task.dueDate && task.status !== 'Done' && new Date(task.dueDate) < new Date();

const statusBadge = (status) => {
  if (status === 'Done') return 'bg-green-100 text-green-700';
  if (status === 'In Progress') return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-200 text-slate-700';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/dashboard')
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loader />;
  if (error)
    return <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>;

  const counts = data?.counts || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {user?.name}</h1>
        <p className="text-sm text-slate-500">Here's what's happening with your work today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total tasks" value={counts.totalTasks ?? 0} />
        <Stat label="Completed" value={counts.completedTasks ?? 0} accent="text-green-600" />
        <Stat label="Pending" value={counts.pendingTasks ?? 0} accent="text-yellow-600" />
        <Stat label="Overdue" value={counts.overdueTasks ?? 0} accent="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Assigned to me</h2>
          {data.assignedToMe.length === 0 ? (
            <div className="text-sm text-slate-500">Nothing assigned to you yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.assignedToMe.map((t) => (
                <li key={t._id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {t.project?.title || 'Project'} ·{' '}
                      {t.dueDate ? (
                        <span className={isOverdue(t) ? 'text-red-600 font-medium' : ''}>
                          Due {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        'No due date'
                      )}
                    </div>
                  </div>
                  <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Recent tasks</h2>
          {data.recentTasks.length === 0 ? (
            <div className="text-sm text-slate-500">No tasks yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentTasks.map((t) => (
                <li key={t._id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {t.project?.title || 'Project'} ·{' '}
                      {t.assignedTo ? `Assigned to ${t.assignedTo.name}` : 'Unassigned'}
                    </div>
                  </div>
                  <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
