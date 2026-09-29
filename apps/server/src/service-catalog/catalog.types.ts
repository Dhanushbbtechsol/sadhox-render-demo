export type CatalogFieldType = "text" | "textarea" | "select";

export type CatalogFormField = {
  name: string;
  label: string;
  type: CatalogFieldType;
  required?: boolean;
  options?: string[];
};

export type CatalogRole = "Admin" | "Agent" | "EndUser";

export type CatalogItemSeed = {
  id: string;
  name: string;
  description: string;
  department: string;
  formFields: CatalogFormField[];
  allowedRoles: CatalogRole[];
};
