import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters');
    if (!form.email.includes('@')) return setError('Please enter a valid email');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    setSubmitting(true);
    try {
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="card">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-slate-500 mb-5">Start managing your team's tasks</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded mb-3">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              name="name"
              className="input"
              value={form.name}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              className="input"
              value={form.email}
              onChange={onChange}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              name="password"
              className="input"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" value={form.role} onChange={onChange} className="input">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Admins can create projects and assign tasks. Members can update their own tasks.
            </p>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
