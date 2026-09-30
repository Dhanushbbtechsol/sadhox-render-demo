/** Shared inline styles for Sadhox transactional emails. */
export const emailStyles = {
  main: {
    backgroundColor: "#f4f6f8",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "24px 0 40px",
    marginBottom: "48px",
    borderRadius: "8px",
    maxWidth: "600px",
  },
  h1: {
    color: "#111827",
    fontSize: "22px",
    fontWeight: "700" as const,
    margin: "24px 40px 16px",
    padding: "0",
  },
  text: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
    padding: "0 40px",
    margin: "0 0 12px",
  },
  muted: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
    padding: "0 40px",
    margin: "16px 0 0",
  },
  buttonContainer: {
    padding: "20px 40px",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600" as const,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 22px",
  },
  badge: {
    display: "inline-block",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "700" as const,
    color: "#fff",
    backgroundColor: "#1A16F3",
  },
  banner: {
    backgroundColor: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    color: "#991b1b",
    fontSize: "14px",
    fontWeight: "700" as const,
    lineHeight: "22px",
    margin: "0 40px 16px",
    padding: "12px 16px",
  },
  row: {
    color: "#374151",
    fontSize: "14px",
    lineHeight: "22px",
    padding: "0 40px",
    margin: "0 0 6px",
  },
} as const;

export function priorityBadgeColor(priority: string): string {
  switch (priority.toUpperCase()) {
    case "P1":
      return "#dc2626";
    case "P2":
      return "#ea580c";
    case "P3":
      return "#1A16F3";
    default:
      return "#64748b";
  }
}
