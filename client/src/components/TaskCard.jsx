export default function TaskCard({ task, onEdit, onDelete }) {
  function dragStart(e) {
    e.dataTransfer.setData("taskId", task._id);
  }

  return (
    <div
      className="task-card"
      draggable
      onDragStart={dragStart}
      onDoubleClick={() => onEdit(task)}
    >
      <div className="task-card-title">{task.title}</div>
      {task.description && <p>{task.description}</p>}

      <div className="task-meta">
        <span className="task-assignee">{task.assignee?.name || "Unassigned"}</span>
        <button
          className="small danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
