export type UserRole = "EndUser" | "Agent" | "Admin" | "Manager";

export type Urgency = "Low" | "Medium" | "High";

export type ServiceRequestStatus =
  | "Draft"
  | "Submitted"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "In Fulfillment"
  | "Fulfilled"
  | "Closed";

export type ChangeType = "Standard" | "Normal" | "Emergency";

export type ChangeStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Scheduled"
  | "Implemented"
  | "Closed"
  | "Rolled Back";

export type CatalogFormFieldType = "text" | "textarea" | "select";

export interface CatalogFormField {
  name: string;
  label: string;
  type: CatalogFormFieldType;
  required?: boolean;
  options?: string[];
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  department: string;
  formFields: CatalogFormField[];
  isActive?: boolean;
}

export type KnowledgeArticleStatus = "Draft" | "Published";

export interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: KnowledgeArticleStatus;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  createdAt: string;
}

export interface ProjectModule {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  catalogId: string;
  catalogName: string;
  requesterId: string;
  requesterName: string;
  status: ServiceRequestStatus;
  justification: string;
  urgency: Urgency;
  fields: Record<string, string>;
  createdAt: string;
  approverId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  assigneeId?: string;
  fulfillmentNotes?: string;
  fulfilledAt?: string;
  projectId?: string | null;
  projectName?: string | null;
  moduleId?: string | null;
  moduleName?: string | null;
}

export interface ChangeRecord {
  id: string;
  title: string;
  description: string;
  type: ChangeType;
  status: ChangeStatus;
  scheduledStart: string;
  scheduledEnd: string;
  rollbackPlan: string;
  createdById: string;
  createdByName: string;
  approvedById?: string;
  createdAt: string;
  projectId?: string | null;
  projectName?: string | null;
  moduleId?: string | null;
  moduleName?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
