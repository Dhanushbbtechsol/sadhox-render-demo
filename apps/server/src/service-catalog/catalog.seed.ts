import type { CatalogFormField } from "../database/schema";

export type CatalogItemSeed = {
  id: string;
  name: string;
  description: string;
  department: string;
  /** Concrete service label (Phase 7); free text, not incident-map validated. */
  subcategory: string;
  formFields: CatalogFormField[];
};

const justification: CatalogFormField = {
  name: "justification",
  label: "Justification",
  type: "textarea",
  required: true,
};

const urgency: CatalogFormField = {
  name: "urgency",
  label: "Urgency",
  type: "select",
  required: true,
  options: ["Low", "Medium", "High"],
};

/**
 * Phase 7 catalog seed / retag targets (match by name on re-run).
 * Department = incident-style category name; subcategory = concrete service label.
 */
export const CATALOG_SEED: CatalogItemSeed[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Request Laptop",
    description: "Request a new developer or standard business laptop.",
    department: "Hardware",
    subcategory: "Laptop request",
    formFields: [
      justification,
      urgency,
      {
        name: "laptopType",
        label: "Laptop type",
        type: "select",
        required: true,
        options: ["Standard", "Developer", "Executive"],
      },
    ],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "VPN Access",
    description: "Request remote VPN access for secure network connectivity.",
    department: "Network & Connectivity",
    subcategory: "VPN access request",
    formFields: [
      justification,
      urgency,
      {
        name: "duration",
        label: "Access duration",
        type: "select",
        required: true,
        options: ["30 days", "90 days", "1 year"],
      },
    ],
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Database Access",
    description: "Request read or write access to a production database.",
    department: "Identity & Access",
    subcategory: "Database access request",
    formFields: [
      justification,
      urgency,
      {
        name: "databaseName",
        label: "Database name",
        type: "text",
        required: true,
      },
      {
        name: "accessLevel",
        label: "Access level",
        type: "select",
        required: true,
        options: ["Read", "Write", "Admin"],
      },
    ],
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "External Monitor",
    description: "Request an additional external display for your workstation.",
    department: "Hardware",
    subcategory: "Monitor request",
    formFields: [
      justification,
      urgency,
      {
        name: "size",
        label: "Preferred size",
        type: "select",
        required: true,
        options: ["24 inch", "27 inch", "32 inch"],
      },
    ],
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Software License",
    description: "Request a licensed software package for your role.",
    department: "Software & OS",
    subcategory: "Software license request",
    formFields: [
      justification,
      urgency,
      {
        name: "softwareName",
        label: "Software name",
        type: "text",
        required: true,
      },
    ],
  },
];
