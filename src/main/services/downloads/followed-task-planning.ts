import type { Aria2Task } from "./aria2-types";

export interface FollowedTaskMigration {
  parentGid: string;
  childGids: string[];
}

export function planFollowedTaskMigrations(tasks: Aria2Task[]): {
  migrations: FollowedTaskMigration[];
  visibleTasks: Aria2Task[];
} {
  const migrations = tasks
    .filter((task) => task.followedBy?.length)
    .map((task) => ({
      parentGid: task.gid,
      childGids: [...new Set(task.followedBy)],
    }));
  const followedParents = new Set(
    migrations.map((migration) => migration.parentGid),
  );

  return {
    migrations,
    visibleTasks: tasks.filter((task) => !followedParents.has(task.gid)),
  };
}
