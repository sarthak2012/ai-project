import { useEffect, useState } from 'react';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/projects', form);
      setForm({ title: '', description: '' });
      setShowForm(false);
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Projects</h1>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
            {showForm ? 'Cancel' : 'New Project'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">
          {error}
        </div>
      )}

      {showForm && user?.role === 'admin' && (
        <form onSubmit={onCreate} className="card space-y-3">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </form>
      )}

      {loading ? (
        <Loader />
      ) : projects.length === 0 ? (
        <div className="card text-sm text-slate-500">
          You don't have any projects yet.
          {user?.role === 'admin' && ' Click "New Project" to create one.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p._id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
