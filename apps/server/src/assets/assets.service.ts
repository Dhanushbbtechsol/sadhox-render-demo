import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { likeContains } from "../common/like-pattern";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  assetAssignments,
  assets,
  incidents,
  serviceRequests,
  users,
  type AssetStatus,
  type AssetType,
} from "../database/schema";
import { claimReference } from "../incidents/reference";
import { MailService } from "../mail/mail.service";
import { assignmentChanged } from "./asset-assignment";
import {
  isOpenIncidentStatus,
  isOpenRequestStatus,
} from "./assets.roles";
import type { CreateAssetDto } from "./dto/create-asset.dto";
import type { LinkTicketDto } from "./dto/link-ticket.dto";
import type { PersonReportQueryDto } from "./dto/list-assets-query.dto";
import type { UpdateAssetDto } from "./dto/update-asset.dto";
import { alias } from "drizzle-orm/pg-core";

export type AssetListItem = {
  id: string;
  assetTag: string;
  referenceCode: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerId: string | null;
  ownerName: string | null;
  linkedTicketId: string | null;
  linkedTicketCount: number;
  /** Present on Admin asset APIs only. */
  purchaseCost: string | null;
  serialNumber: string | null;
  location: string | null;
  assignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AssignmentEvent = {
  createdAt: Date;
  fromOwnerId: string | null;
  toOwnerId: string | null;
};

type HoldingWindow = {
  assetId: string;
  assetTag: string;
  referenceCode: string;
  name: string;
  from: Date;
  to: Date | null;
};

export type PersonReportRow = {
  assetId: string;
  assetTag: string;
  referenceCode: string;
  name: string;
  from: string;
  to: string | null;
};

/**
 * Pure interval-overlap logic (KTD5): a person's holding window for an asset
 * starts when an assignment row makes them the owner and ends at the next
 * assignment row for that asset (or stays open when there is none yet).
 * Exported for direct unit testing without a database.
 */
export function computeHoldingWindows(
  eventsByAsset: Map<string, AssignmentEvent[]>,
  assetInfo: Map<string, { assetTag: string; referenceCode: string; name: string }>,
  personId: string,
): HoldingWindow[] {
  const windows: HoldingWindow[] = [];
  for (const [assetId, events] of eventsByAsset) {
    const info = assetInfo.get(assetId);
    if (!info) continue;
    const sorted = [...events].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (let i = 0; i < sorted.length; i += 1) {
      const event = sorted[i]!;
      if (event.toOwnerId !== personId) continue;
      const next = sorted[i + 1];
      windows.push({
        assetId,
        assetTag: info.assetTag,
        referenceCode: info.referenceCode,
        name: info.name,
        from: event.createdAt,
        to: next ? next.createdAt : null,
      });
    }
  }
  return windows;
}

/** Inclusive interval overlap: open-ended windows (to === null) overlap any range that has started. */
export function windowOverlapsRange(
  window: { from: Date; to: Date | null },
  rangeFrom: Date,
  rangeTo: Date,
): boolean {
  const startsBeforeRangeEnds = window.from.getTime() <= rangeTo.getTime();
  const endsAfterRangeStarts =
    window.to === null || window.to.getTime() >= rangeFrom.getTime();
  return startsBeforeRangeEnds && endsAfterRangeStarts;
}

/** Agent-safe projection — never includes purchaseCost. */
export type LinkedAssetPublic = {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerName: string | null;
  linkedTicketId: string | null;
};

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
  ) {}

  async list(query: {
    search?: string;
    type?: AssetType;
    status?: AssetStatus;
    linkedTicketId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const filters = [];
    if (query.type) filters.push(eq(assets.type, query.type));
    if (query.status) filters.push(eq(assets.status, query.status));
    if (query.linkedTicketId) {
      filters.push(eq(assets.linkedTicketId, query.linkedTicketId));
    }
    if (query.search?.trim()) {
      const needle = likeContains(query.search.trim());
      filters.push(
        or(
          ilike(assets.assetTag, needle),
          ilike(assets.name, needle),
          ilike(assets.referenceCode, needle),
        ),
      );
    }

    const where = filters.length ? and(...filters) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: assets.id,
          assetTag: assets.assetTag,
          referenceCode: assets.referenceCode,
          name: assets.name,
          type: assets.type,
          status: assets.status,
          ownerId: assets.ownerId,
          ownerName: users.name,
          linkedTicketId: assets.linkedTicketId,
          purchaseCost: assets.purchaseCost,
          serialNumber: assets.serialNumber,
          location: assets.location,
          assignedAt: assets.assignedAt,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
        })
        .from(assets)
        .leftJoin(users, eq(assets.ownerId, users.id))
        .where(where)
        .orderBy(desc(assets.updatedAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(assets).where(where),
    ]);

    const data: AssetListItem[] = rows.map((row) => ({
      ...row,
      purchaseCost: row.purchaseCost ?? null,
      serialNumber: row.serialNumber ?? null,
      location: row.location ?? null,
      assignedAt: row.assignedAt ?? null,
      linkedTicketCount: row.linkedTicketId ? 1 : 0,
    }));

    return {
      data,
      page,
      pageSize,
      total: Number(totalRow[0]?.value ?? 0),
    };
  }

  /** Public (non-financial) assets linked to a ticket — for incident detail. */
  async listLinkedPublic(ticketId: string): Promise<LinkedAssetPublic[]> {
    const rows = await this.db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        status: assets.status,
        ownerName: users.name,
        linkedTicketId: assets.linkedTicketId,
      })
      .from(assets)
      .leftJoin(users, eq(assets.ownerId, users.id))
      .where(eq(assets.linkedTicketId, ticketId))
      .orderBy(desc(assets.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      assetTag: row.assetTag,
      name: row.name,
      type: row.type,
      status: row.status,
      ownerName: row.ownerName,
      linkedTicketId: row.linkedTicketId,
    }));
  }

  async getById(id: string) {
    const [row] = await this.db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        status: assets.status,
        ownerId: assets.ownerId,
        ownerName: users.name,
        linkedTicketId: assets.linkedTicketId,
        purchaseCost: assets.purchaseCost,
        serialNumber: assets.serialNumber,
        location: assets.location,
        assignedAt: assets.assignedAt,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
      })
      .from(assets)
      .leftJoin(users, eq(assets.ownerId, users.id))
      .where(eq(assets.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Asset not found");
    return {
      ...row,
      purchaseCost: row.purchaseCost ?? null,
      serialNumber: row.serialNumber ?? null,
      location: row.location ?? null,
      assignedAt: row.assignedAt ?? null,
      linkedTicketCount: row.linkedTicketId ? 1 : 0,
    };
  }

  async create(dto: CreateAssetDto, assignedBy?: string | null) {
    await this.ensureUniqueTag(dto.assetTag);
    if (dto.ownerId) await this.ensureOwner(dto.ownerId);

    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const referenceCode = await claimReference(tx, "AST");
      const rows = await tx
        .insert(assets)
        .values({
          referenceCode,
          assetTag: dto.assetTag.trim(),
          name: dto.name.trim(),
          type: dto.type,
          status: dto.status ?? "Active",
          ownerId: dto.ownerId ?? null,
          purchaseCost: dto.purchaseCost ?? null,
          serialNumber: dto.serialNumber?.trim() || null,
          location: dto.location?.trim() || null,
          assignedAt: dto.ownerId ? now : null,
        })
        .returning();
      const row = rows[0];
      if (row && dto.ownerId) {
        await tx.insert(assetAssignments).values({
          assetId: row.id,
          fromOwnerId: null,
          toOwnerId: dto.ownerId,
          assignedBy: assignedBy ?? null,
          note: null,
        });
      }
      return rows;
    });

    const result = await this.getById(created!.id);
    if (result.ownerId) {
      await this.notifyOwner(result.ownerId, {
        assetId: result.id,
        assetTag: result.assetTag,
        assetName: result.name,
        event: "owner_assigned",
      });
    }
    return result;
  }

  async update(
    id: string,
    dto: UpdateAssetDto,
    assignedBy?: string | null,
  ) {
    const before = await this.getById(id);
    if (dto.assetTag) await this.ensureUniqueTag(dto.assetTag, id);
    if (dto.ownerId) await this.ensureOwner(dto.ownerId);

    const ownerChanging =
      dto.ownerId !== undefined &&
      assignmentChanged(before.ownerId, dto.ownerId);
    const now = new Date();

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(assets)
        .set({
          ...(dto.assetTag !== undefined ? { assetTag: dto.assetTag.trim() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
          ...(dto.purchaseCost !== undefined
            ? { purchaseCost: dto.purchaseCost }
            : {}),
          ...(dto.serialNumber !== undefined
            ? { serialNumber: dto.serialNumber?.trim() || null }
            : {}),
          ...(dto.location !== undefined
            ? { location: dto.location?.trim() || null }
            : {}),
          ...(ownerChanging
            ? {
                assignedAt: dto.ownerId ? now : null,
              }
            : {}),
          updatedAt: now,
        })
        .where(eq(assets.id, id))
        .returning();
      const row = rows[0];
      if (row && ownerChanging) {
        await tx.insert(assetAssignments).values({
          assetId: id,
          fromOwnerId: before.ownerId,
          toOwnerId: dto.ownerId ?? null,
          assignedBy: assignedBy ?? null,
          note: dto.assignmentNote?.trim() || null,
        });
      }
      return rows;
    });

    if (!updated) throw new NotFoundException("Asset not found");

    const result = await this.getById(updated.id);

    if (ownerChanging && result.ownerId) {
      await this.notifyOwner(result.ownerId, {
        assetId: result.id,
        assetTag: result.assetTag,
        assetName: result.name,
        event: "owner_assigned",
      });
    }

    return result;
  }

  async listAssignments(assetId: string) {
    await this.getById(assetId);
    const fromOwner = alias(users, "from_owner");
    const toOwner = alias(users, "to_owner");
    const byUser = alias(users, "assigned_by_user");

    const rows = await this.db
      .select({
        id: assetAssignments.id,
        assetId: assetAssignments.assetId,
        fromOwnerId: assetAssignments.fromOwnerId,
        fromOwnerName: fromOwner.name,
        toOwnerId: assetAssignments.toOwnerId,
        toOwnerName: toOwner.name,
        assignedBy: assetAssignments.assignedBy,
        assignedByName: byUser.name,
        note: assetAssignments.note,
        createdAt: assetAssignments.createdAt,
      })
      .from(assetAssignments)
      .leftJoin(fromOwner, eq(assetAssignments.fromOwnerId, fromOwner.id))
      .leftJoin(toOwner, eq(assetAssignments.toOwnerId, toOwner.id))
      .leftJoin(byUser, eq(assetAssignments.assignedBy, byUser.id))
      .where(eq(assetAssignments.assetId, assetId))
      .orderBy(desc(assetAssignments.createdAt));

    return {
      data: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  /** Admin-only dated person report (R3, KTD5): interval overlap, not just current owner. */
  async personReport(query: PersonReportQueryDto): Promise<{ data: PersonReportRow[] }> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException("from must not be after to");
    }

    const touched = await this.db
      .selectDistinct({ assetId: assetAssignments.assetId })
      .from(assetAssignments)
      .where(
        or(
          eq(assetAssignments.fromOwnerId, query.personId),
          eq(assetAssignments.toOwnerId, query.personId),
        ),
      );
    const assetIds = touched.map((row) => row.assetId);
    if (assetIds.length === 0) return { data: [] };

    const rows = await this.db
      .select({
        assetId: assetAssignments.assetId,
        assetTag: assets.assetTag,
        referenceCode: assets.referenceCode,
        name: assets.name,
        fromOwnerId: assetAssignments.fromOwnerId,
        toOwnerId: assetAssignments.toOwnerId,
        createdAt: assetAssignments.createdAt,
      })
      .from(assetAssignments)
      .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
      .where(inArray(assetAssignments.assetId, assetIds))
      .orderBy(asc(assetAssignments.assetId), asc(assetAssignments.createdAt));

    const eventsByAsset = new Map<string, AssignmentEvent[]>();
    const assetInfo = new Map<
      string,
      { assetTag: string; referenceCode: string; name: string }
    >();
    for (const row of rows) {
      const events = eventsByAsset.get(row.assetId) ?? [];
      events.push({
        createdAt: row.createdAt,
        fromOwnerId: row.fromOwnerId,
        toOwnerId: row.toOwnerId,
      });
      eventsByAsset.set(row.assetId, events);
      assetInfo.set(row.assetId, {
        assetTag: row.assetTag,
        referenceCode: row.referenceCode,
        name: row.name,
      });
    }

    const windows = computeHoldingWindows(eventsByAsset, assetInfo, query.personId);
    const data: PersonReportRow[] = windows
      .filter((window) => windowOverlapsRange(window, from, to))
      .map((window) => ({
        assetId: window.assetId,
        assetTag: window.assetTag,
        referenceCode: window.referenceCode,
        name: window.name,
        from: window.from.toISOString(),
        to: window.to ? window.to.toISOString() : null,
      }));

    return { data };
  }

  async softDelete(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(assets)
      .set({ status: "Retired", updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Asset not found");
    return this.getById(updated.id);
  }

  async linkTicket(id: string, dto: LinkTicketDto) {
    const before = await this.getById(id);
    await this.ensureActiveTicket(dto.ticketId, dto.ticketType);

    const [updated] = await this.db
      .update(assets)
      .set({ linkedTicketId: dto.ticketId, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Asset not found");
    const result = await this.getById(updated.id);

    if (before.ownerId) {
      await this.notifyOwner(before.ownerId, {
        assetId: result.id,
        assetTag: result.assetTag,
        assetName: result.name,
        event: "ticket_linked",
        ticketId: dto.ticketId,
      });
    }

    return result;
  }

  async unlinkTicket(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(assets)
      .set({ linkedTicketId: null, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Asset not found");
    return this.getById(updated.id);
  }

  private async notifyOwner(
    ownerId: string,
    info: {
      assetId: string;
      assetTag: string;
      assetName: string;
      event: "owner_assigned" | "ticket_linked";
      ticketId?: string;
    },
  ) {
    try {
      const [owner] = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1);
      if (!owner?.email) return;
      await this.mail.sendAssetNotification(owner.email, info);
    } catch (err) {
      this.logger.warn(
        `asset mail enqueue failed asset=${info.assetId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async ensureUniqueTag(tag: string, excludeId?: string) {
    const filters = [eq(assets.assetTag, tag.trim())];
    if (excludeId) filters.push(ne(assets.id, excludeId));
    const [existing] = await this.db
      .select({ id: assets.id })
      .from(assets)
      .where(and(...filters))
      .limit(1);
    if (existing) {
      throw new ConflictException(`Asset tag ${tag} already exists`);
    }
  }

  private async ensureOwner(ownerId: string) {
    const [owner] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);
    if (!owner) throw new BadRequestException("Owner not found");
  }

  private async ensureActiveTicket(
    ticketId: string,
    ticketType: "incident" | "service_request",
  ) {
    if (ticketType === "incident") {
      const [row] = await this.db
        .select({ id: incidents.id, status: incidents.status })
        .from(incidents)
        .where(eq(incidents.id, ticketId))
        .limit(1);
      if (!row) throw new BadRequestException("Incident not found");
      if (!isOpenIncidentStatus(row.status)) {
        throw new BadRequestException("Incident is not active");
      }
      return;
    }

    const [row] = await this.db
      .select({ id: serviceRequests.id, status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, ticketId))
      .limit(1);
    if (!row) throw new BadRequestException("Service request not found");
    if (!isOpenRequestStatus(row.status)) {
      throw new BadRequestException("Service request is not active");
    }
  }
}
