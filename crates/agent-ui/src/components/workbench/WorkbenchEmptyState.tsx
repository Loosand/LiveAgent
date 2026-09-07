import { Empty } from "../ui/empty";

export type WorkbenchEmptyStateProps = {
  title: string;
  description?: string;
};

/** Droppable empty-canvas placeholder shown when the pane tree is empty. */
export function WorkbenchEmptyState(props: WorkbenchEmptyStateProps) {
  return (
    <Empty
      data-workbench-empty-state=""
      title={props.title}
      description={props.description}
      className="h-full min-h-0 w-full"
    />
  );
}
