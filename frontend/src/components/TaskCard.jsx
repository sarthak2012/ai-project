import { useState } from 'react';

const STATUSES = ['Todo', 'In Progress', 'Done'];

const statusBadge = (status) => {
  if (status === 'Done') return 'bg-green-100 text-green-700';
  if (status === 'In Progress') return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-200 text-slate-700';
};

const isOverdue = (task) =>
  task.dueDate && task.status !== 'Done' && new Date(task.dueDate) < new Date();

export default function TaskCard({ task, canEdit, canChangeStatus, onStatusChange, onDelete, onEdit }) {
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (e) => {
    const newStatus = e.target.value;
    setUpdating(true);
    try {
      await onStatusChange(task._id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 truncate">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
              {task.description}
            </p>
          )}
        </div>
        <span className={`badge ${statusBadge(task.status)}`}>{task.status}</span>
      </div>

      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Assignee:{' '}
          <span className="text-slate-700 font-medium">
            {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
          </span>
        </span>
        {task.dueDate && (
          <span className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
            Due: {new Date(task.dueDate).toLocaleDateString()}
            {isOverdue(task) ? ' (overdue)' : ''}
          </span>
        )}
      </div>

      {(canEdit || canChangeStatus) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {(canEdit || canChangeStatus) && (
            <select
              value={task.status}
              onChange={handleStatus}
              disabled={updating}
              className="input max-w-[160px]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {canEdit && (
            <>
              <button onClick={() => onEdit(task)} className="btn-secondary">
                Edit
              </button>
              <button onClick={() => onDelete(task._id)} className="btn-danger">
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
