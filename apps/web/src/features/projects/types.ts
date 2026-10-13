export type Project = {
  id: string;
  referenceCode?: string | null;
  name: string;
  managerId: string | null;
  /** Present on Admin/Manager/Agent list/get when joined from users */
  managerName?: string | null;
  createdAt: string;
};

export type ProjectMember = {
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

export type ProjectModule = {
  id: string;
  projectId: string;
  name: string;
  createdAt?: string;
};

export type DirectoryUser = {
  id: string;
  referenceCode?: string | null;
  name: string;
  email: string;
  role: string;
  reportsToId?: string | null;
};

export type CreateProjectInput = {
  name: string;
  /** Required — matches API/DB `projects.manager_id` NOT NULL */
  managerId: string;
};

/** One module in the desired full set for {@link SaveProjectSummaryInput}. Omit `id` to create. */
export type ProjectSummaryModuleInput = {
  id?: string;
  name: string;
};

/**
 * U8 — one save for the project summary dialog. Carries the full desired
 * state for name, manager, members, and modules so a single submit
 * persists all four together.
 */
export type SaveProjectSummaryInput = {
  name: string;
  managerId: string;
  memberUserIds: string[];
  modules: ProjectSummaryModuleInput[];
};
