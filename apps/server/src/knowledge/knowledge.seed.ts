/**
 * Phase 5 categories (kept): names historically aligned with old catalog departments.
 * Phase 7 adds five categories mirroring incident category names — leave these three alone.
 */
export const KNOWLEDGE_CATEGORY_SEED = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    name: "IT Hardware",
    slug: "it-hardware",
    description: "Laptops, peripherals, and workstation hardware help.",
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    name: "Access",
    slug: "access",
    description: "VPN, accounts, and identity access guides.",
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    name: "Data",
    slug: "data",
    description: "Database access and data platform how-tos.",
  },
] as const;

/** Phase 7 — mirrors INCIDENT_CATEGORY_SUBCATEGORY_MAP category names (idempotent by slug). */
export const PHASE7_KNOWLEDGE_CATEGORY_SEED = [
  {
    id: "a4444444-4444-4444-8444-444444444444",
    name: "Hardware",
    slug: "hardware",
    description: "Hardware incidents and service requests — laptops, peripherals, printers.",
  },
  {
    id: "a5555555-5555-4555-8555-555555555555",
    name: "Software & OS",
    slug: "software-and-os",
    description: "Operating systems, productivity apps, enterprise software, and developer tools.",
  },
  {
    id: "a6666666-6666-4666-8666-666666666666",
    name: "Network & Connectivity",
    slug: "network-and-connectivity",
    description: "Wi-Fi, VPN, remote desktop, DNS, and firewall connectivity help.",
  },
  {
    id: "a7777777-7777-4777-8777-777777777777",
    name: "Identity & Access",
    slug: "identity-and-access",
    description: "Passwords, MFA, SSO, and role permission guides.",
  },
  {
    id: "a8888888-8888-4888-8888-888888888888",
    name: "Collaboration",
    slug: "collaboration",
    description: "Email, messaging, video conferencing, and file sharing help.",
  },
] as const;

export const KNOWLEDGE_ARTICLE_SEED = [
  {
    id: "b1111111-1111-4111-8111-111111111111",
    title: "Requesting a laptop",
    slug: "requesting-a-laptop",
    categoryId: KNOWLEDGE_CATEGORY_SEED[0].id,
    status: "Published" as const,
    body: `Use the Service Catalog item **Request Laptop** when you need a new workstation.

Before you submit:
1. Confirm whether you need a Standard, Developer, or Executive build.
2. Note any docking station or monitor requirements in the justification.
3. Your manager may be asked to approve the request.

Typical fulfillment time is 3–5 business days after approval.`,
  },
  {
    id: "b2222222-2222-4222-8222-222222222222",
    title: "VPN access checklist",
    slug: "vpn-access-checklist",
    categoryId: KNOWLEDGE_CATEGORY_SEED[1].id,
    status: "Published" as const,
    body: `Remote VPN access is requested through the **VPN Access** catalog item.

Steps:
1. Choose the access duration you need (30 days, 90 days, or 1 year).
2. Explain the business reason in the justification field.
3. Install the company VPN client after the request is fulfilled.

If you already have access but cannot connect, report an incident from My Portal instead of opening a new access request.`,
  },
  {
    id: "b3333333-3333-4333-8333-333333333333",
    title: "Database access roles",
    slug: "database-access-roles",
    categoryId: KNOWLEDGE_CATEGORY_SEED[2].id,
    status: "Published" as const,
    body: `Use **Database Access** in the catalog to request Read, Write, or Admin rights.

Guidelines:
- Prefer Read unless you need to change data.
- Name the exact database in the form field.
- Admin access requires Admin approval and a clear rollback plan for changes.

Related catalog department: Data.`,
  },
  {
    id: "b4444444-4444-4444-8444-444444444444",
    title: "How to report an incident",
    slug: "how-to-report-an-incident",
    categoryId: KNOWLEDGE_CATEGORY_SEED[1].id,
    status: "Published" as const,
    body: `Use My Portal → Report an issue.

Include:
1. What you were trying to do
2. Exact error text or screenshot description
3. When it started and whether others are affected

Priority is calculated from impact × urgency — pick honestly so SLA clocks stay accurate.`,
  },
  {
    id: "b5555555-5555-4555-8555-555555555555",
    title: "Draft: hardware lifecycle (internal)",
    slug: "draft-hardware-lifecycle",
    categoryId: KNOWLEDGE_CATEGORY_SEED[0].id,
    status: "Draft" as const,
    body: "Internal draft about refresh cycles. Not visible to End User or Agent until Published.",
  },
] as const;

/**
 * Phase 7 Published articles. Skip on seed if slug or title already exists.
 * Bodies are starter content for the IT team to review — generic, no invented URLs/vendors.
 */
export const PHASE7_KNOWLEDGE_ARTICLE_SEED = [
  {
    id: "b6666666-6666-4666-8666-666666666666",
    title: "MFA Reset & Setup Guide",
    slug: "mfa-reset-and-setup-guide",
    categoryId: PHASE7_KNOWLEDGE_CATEGORY_SEED[3].id, // Identity & Access
    status: "Published" as const,
    body: `This guide explains how to reset or set up multi-factor authentication (MFA) for your work account.

When to use this guide
- You lost access to your previous MFA device or authenticator app.
- You are enrolling MFA for the first time after your account was enabled.
- Your MFA prompts fail repeatedly after a phone or OS upgrade.

Before you start
1. Confirm you can receive email or SMS from your IT team for verification codes if asked.
2. Have a secondary device available if your organization requires a backup method.
3. Note the approximate time the problem started and any error text you see.

Reset and setup steps (high level)
1. Sign in to the company identity portal using your usual username and password. Your IT team will provide the address if you do not have it bookmarked.
2. Open Security or MFA settings and choose Reset or Add method.
3. Follow on-screen prompts to register an authenticator app or approved device.
4. Complete a test sign-in. Keep the old method disabled only after the new method works.

If enrollment fails
- Wait a few minutes and retry; temporary lockouts clear automatically.
- Try a different network (office Wi-Fi vs mobile hotspot) in case outbound MFA traffic is blocked.
- Report an incident under Identity & Access if you cannot complete enrollment after two attempts.

Do not share one-time codes with anyone. IT will never ask you to read a full code over an unsolicited call.`,
  },
  {
    id: "b7777777-7777-4777-8777-777777777777",
    title: "Connecting to Corporate VPN (Windows / macOS / Linux)",
    slug: "connecting-to-corporate-vpn",
    categoryId: PHASE7_KNOWLEDGE_CATEGORY_SEED[2].id, // Network & Connectivity
    status: "Published" as const,
    body: `Use this article when you need to connect a company or approved personal device to the corporate VPN.

Prerequisites
- An approved VPN Access service request is fulfilled, or your role already includes VPN entitlement.
- The company VPN client is installed. Your IT team will provide the download location and profile name.
- You know your work username and can complete MFA when prompted.

Connect (all platforms)
1. Open the VPN client and select the corporate profile. Your IT team will provide the gateway address if it is not preloaded.
2. Sign in with your work credentials. Complete MFA when asked.
3. Confirm the client shows Connected and that internal sites resolve.

Windows tips
- Run the client as your normal user first; elevate only if IT instructs you to.
- After sleep or dock changes, disconnect and reconnect once before reporting an issue.

macOS tips
- Allow the VPN extension in System Settings if the OS prompts after an update.
- Check that the profile is not set to On Demand unless IT configured it that way.

Linux tips
- Use the supported package or configuration file from IT; avoid mixing community profiles with the corporate one.
- Ensure system time is synced; large clock skew breaks MFA and tunnels.

If you cannot connect, capture the exact error text, your OS version, and whether office Wi-Fi or home network was used, then open an incident under Network & Connectivity.`,
  },
  {
    id: "b8888888-8888-4888-8888-888888888888",
    title: "Requesting New Software Licenses & Approvals",
    slug: "requesting-new-software-licenses-and-approvals",
    categoryId: PHASE7_KNOWLEDGE_CATEGORY_SEED[1].id, // Software & OS
    status: "Published" as const,
    body: `Follow this process when you need a new licensed application or an additional seat for software already used by your team.

Prefer the Service Catalog
1. Open Software License (or the matching catalog item) and submit a request.
2. Name the product exactly as your manager expects it to appear on invoices.
3. State the business reason, expected number of users, and whether a trial already proved the need.
4. Choose urgency honestly so approvers can prioritize.

What approvers look for
- A clear business outcome (what work is blocked without the license).
- Confirmation that a standard or already-approved alternative was considered.
- Whether data will leave company systems (cloud SaaS vs on-prem).

After approval
- Wait for fulfillment notes before installing. Sideloading unapproved installers may violate policy.
- Install only from the location IT provides. Your IT team will provide the address or package name.
- Keep the request ID handy if vendors ask for proof of entitlement.

Common delays
- Missing product edition (Standard vs Pro).
- Requests for Admin rights that are not required for daily use.
- Duplicate requests for the same product in the same week.

If your request is rejected, read the rejection reason, adjust the justification, and resubmit or discuss alternatives with your manager. For install failures after fulfillment, open an incident under Software & OS.`,
  },
  {
    id: "b9999999-9999-4999-8999-999999999999",
    title: "Troubleshooting Wi-Fi & Network Authentication Errors",
    slug: "troubleshooting-wifi-and-network-authentication-errors",
    categoryId: PHASE7_KNOWLEDGE_CATEGORY_SEED[2].id, // Network & Connectivity
    status: "Published" as const,
    body: `Use these steps when devices fail to join office Wi-Fi or show authentication errors on the corporate network.

Quick checks
1. Confirm you selected the correct SSID. Guest and corporate networks are separate.
2. Forget the network and reconnect once with your current password.
3. Toggle airplane mode or reboot the device to clear a stuck wireless stack.
4. Try another nearby access area to rule out a single access point issue.

Authentication errors
- Wrong password: reset via the identity portal if your account password recently changed. Your IT team will provide the address.
- Certificate or 802.1X failures after OS updates: reconnect and accept the organization certificate only if the prompt matches IT guidance.
- Account lockout: wait for the lockout window to expire or contact IT; repeated failures can lock MFA and network login together.

Wired vs wireless
- If a docking station Ethernet link works but Wi-Fi fails, capture that in the incident — it narrows the fault to wireless.
- Disable random hardware addresses for the corporate SSID if your OS offers that option and IT allows it.

When to open an incident
- Multiple people in the same room fail at the same time.
- You completed the quick checks and still cannot authenticate.
- VPN works from home but office Wi-Fi authentication fails (or the reverse).

Include OS version, device type, SSID name, exact error text, and whether the issue started after a password or MFA change. Category: Network & Connectivity.`,
  },
  {
    id: "baaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Printer Installation & Driver Setup Instructions",
    slug: "printer-installation-and-driver-setup",
    categoryId: PHASE7_KNOWLEDGE_CATEGORY_SEED[0].id, // Hardware
    status: "Published" as const,
    body: `This article covers installing a supported office printer and loading the correct driver on a company workstation.

Before you install
- Confirm the printer is on the approved model list for your site.
- Know the printer name or queue as shown on the device label or nearby signage.
- Prefer the company print queue or deployment package. Your IT team will provide the address or package name.

Windows
1. Open Printers & scanners and choose Add device / Add printer.
2. Select the printer from the directory when available. Avoid manual IP installs unless IT instructs you.
3. If prompted for a driver, use the package IT provides — do not download random drivers from the public internet.
4. Print a test page and confirm duplex and staple options match the device.

macOS
1. Open Printers & Scanners and add the printer via the directory or IT-provided queue.
2. Use the AirPrint or vendor driver only if IT lists it as supported for that model.
3. Remove duplicate queues that point at the same device to avoid misrouted jobs.

Common issues
- Jobs stuck in queue: clear your local queue, then reprint one page.
- Wrong tray or grayscale only: open printer preferences and reset to defaults, then reapply required options.
- Access denied: request printer access through the Service Catalog if your role lacks permission.

If installation fails after following these steps, open an incident under Hardware with the printer name, your OS, and any error dialog text.`,
  },
] as const;
