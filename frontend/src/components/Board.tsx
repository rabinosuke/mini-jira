// カンバンボード本体（ドラッグ&ドロップ）。表示とD&D配線を担当。
// 操作のロジック（API呼び出し等）は props で親から受け取る。
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Task } from "../types";

const COLUMNS = [
  { key: "todo", label: "未着手" },
  { key: "in_progress", label: "作業中" },
  { key: "in_review", label: "レビュー" },
  { key: "done", label: "完了" },
];

const PRIORITY_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };
const PRIORITY_COLOR: Record<string, string> = {
  high: "#d85a30",
  medium: "#378add",
  low: "#888780",
};
const TYPE_LABEL: Record<string, string> = {
  task: "タスク",
  bug: "バグ",
  story: "ストーリー",
  epic: "エピック",
};
const TYPE_COLOR: Record<string, string> = {
  task: "#378add",
  bug: "#d85a30",
  story: "#3b6d11",
  epic: "#534ab7",
};

type Props = {
  tasks: Task[];
  isManager: boolean;
  currentUserId: number;
  onCardClick: (task: Task) => void;
  onMove: (task: Task, newStatus: string) => void;
  onDelete: (task: Task) => void;
};

export default function Board({
  tasks,
  isManager,
  currentUserId,
  onCardClick,
  onMove,
  onDelete,
}: Props) {
  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const task = tasks.find((t) => t.id === Number(draggableId));
    if (!task) return;
    // 権限チェック（開発者は自分の担当タスクのみ）
    const canEdit = isManager || task.assigneeId === currentUserId;
    if (!canEdit) return;
    onMove(task, destination.droppableId);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <Droppable droppableId={col.key} key={col.key}>
              {(dropProvided) => (
                <div
                  className="column"
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                >
                  <div className="column-head">
                    {col.label} <span className="count">{colTasks.length}</span>
                  </div>
                  {colTasks.map((task, index) => {
                    const canEdit = isManager || task.assigneeId === currentUserId;
                    return (
                      <Draggable
                        draggableId={String(task.id)}
                        index={index}
                        key={task.id}
                        isDragDisabled={!canEdit}
                      >
                        {(dragProvided) => (
                          <div
                            className="card"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => onCardClick(task)}
                          >
                            <span
                              className="type-badge"
                              style={{ background: TYPE_COLOR[task.type] }}
                            >
                              {TYPE_LABEL[task.type]}
                            </span>
                            <div className="card-title">{task.title}</div>
                            <div className="card-meta">
                              <span
                                className="priority"
                                style={{ color: PRIORITY_COLOR[task.priority] }}
                              >
                                ● {PRIORITY_LABEL[task.priority]}
                              </span>
                              <span className="assignee">
                                {task.assignee ? task.assignee.name : "未割当"}
                              </span>
                            </div>
                            {isManager && (
                              <div className="card-actions">
                                <button
                                  className="delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(task);
                                  }}
                                >
                                  削除
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
