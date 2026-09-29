import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  assets,
  incidents,
  serviceRequests,
  users,
  type AssetStatus,
  type AssetType,
} from "../database/schema";
import { MailService } from "../mail/mail.service";
import {
  isOpenIncidentStatus,
  isOpenRequestStatus,
} from "./assets.roles";
import type { CreateAssetDto } from "./dto/create-asset.dto";
import type { LinkTicketDto } from "./dto/link-ticket.dto";
import type { UpdateAssetDto } from "./dto/update-asset.dto";

export type AssetListItem = {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerId: string | null;
  ownerName: string | null;
  linkedTicketId: string | null;
  linkedTicketCount: number;
  createdAt: Date;
  updatedAt: Date;
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
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const filters = [];
    if (query.type) filters.push(eq(assets.type, query.type));
    if (query.status) filters.push(eq(assets.status, query.status));
    if (query.search?.trim()) {
      const needle = `%${query.search.trim()}%`;
      filters.push(
        or(ilike(assets.assetTag, needle), ilike(assets.name, needle)),
      );
    }

    const where = filters.length ? and(...filters) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: assets.id,
          assetTag: assets.assetTag,
          name: assets.name,
          type: assets.type,
          status: assets.status,
          ownerId: assets.ownerId,
          ownerName: users.name,
          linkedTicketId: assets.linkedTicketId,
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
      linkedTicketCount: row.linkedTicketId ? 1 : 0,
    }));

    return {
      data,
      page,
      pageSize,
      total: Number(totalRow[0]?.value ?? 0),
    };
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
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
      })
      .from(assets)
      .leftJoin(users, eq(assets.ownerId, users.id))
      .where(eq(assets.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Asset not found");
    return { ...row, linkedTicketCount: row.linkedTicketId ? 1 : 0 };
  }

  async create(dto: CreateAssetDto) {
    await this.ensureUniqueTag(dto.assetTag);
    if (dto.ownerId) await this.ensureOwner(dto.ownerId);

    const [created] = await this.db
      .insert(assets)
      .values({
        assetTag: dto.assetTag.trim(),
        name: dto.name.trim(),
        type: dto.type,
        status: dto.status ?? "Active",
        ownerId: dto.ownerId ?? null,
      })
      .returning();

    const result = await this.getById(created.id);
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

  async update(id: string, dto: UpdateAssetDto) {
    const before = await this.getById(id);
    if (dto.assetTag) await this.ensureUniqueTag(dto.assetTag, id);
    if (dto.ownerId) await this.ensureOwner(dto.ownerId);

    const [updated] = await this.db
      .update(assets)
      .set({
        ...(dto.assetTag !== undefined ? { assetTag: dto.assetTag.trim() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Asset not found");
    const result = await this.getById(updated.id);

    if (
      dto.ownerId !== undefined &&
      result.ownerId &&
      result.ownerId !== before.ownerId
    ) {
      await this.notifyOwner(result.ownerId, {
        assetId: result.id,
        assetTag: result.assetTag,
        assetName: result.name,
        event: "owner_assigned",
      });
    }

    return result;
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
