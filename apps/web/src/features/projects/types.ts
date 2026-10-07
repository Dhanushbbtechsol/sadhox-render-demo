export type Project = {
  id: string;
  name: string;
  managerId: string | null;
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
  name: string;
  email: string;
  role: string;
};

export type CreateProjectInput = {
  name: string;
  /** Required — matches API/DB `projects.manager_id` NOT NULL */
  managerId: string;
};

export type UpdateProjectInput = {
  name?: string;
  managerId?: string | null;
};
