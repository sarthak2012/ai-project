import { Link } from 'react-router-dom';

export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="card hover:shadow-md hover:border-brand-500 transition block"
    >
      <h3 className="font-semibold text-slate-900 truncate">{project.title}</h3>
      {project.description && (
        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{project.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Admin: {project.admin?.name || '—'}</span>
        <span>{(project.members?.length || 0) + 1} members</span>
      </div>
    </Link>
  );
}
