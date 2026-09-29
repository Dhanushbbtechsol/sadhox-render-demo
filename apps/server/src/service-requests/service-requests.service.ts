import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { users } from "../database/schema";
import type { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import {
  createServiceRequest,
  getServiceRequestForUser,
  listCatalogForUser,
  listServiceRequestsForUser,
  type StoreFailure,
  type StoreUser,
} from "./request-store";

@Injectable()
export class ServiceRequestsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  listCatalog(user: AuthUser) {
    return this.unwrap(listCatalogForUser(this.toStoreUser(user)));
  }

  list(user: AuthUser) {
    return this.unwrap(listServiceRequestsForUser(this.toStoreUser(user)));
  }

  get(user: AuthUser, id: string) {
    return this.unwrap(getServiceRequestForUser(this.toStoreUser(user), id));
  }

  async create(user: AuthUser, dto: CreateServiceRequestDto) {
    const name = await this.resolveRequesterName(user);
    return this.unwrap(
      createServiceRequest({ id: user.userId, name, role: user.role }, {
        catalogId: dto.catalogId,
        justification: dto.justification,
        urgency: dto.urgency,
        fields: dto.fields,
      }),
    );
  }

  private toStoreUser(user: AuthUser): StoreUser {
    return { id: user.userId, name: user.email, role: user.role };
  }

  private async resolveRequesterName(user: AuthUser): Promise<string> {
    const [row] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    return row?.name ?? user.email;
  }

  private unwrap<T>(
    result: { ok: true; data: T } | { ok: false; error: StoreFailure },
  ): T {
    if (!result.ok) this.throwStoreFailure(result.error);
    return result.data;
  }

  private throwStoreFailure(error: StoreFailure): never {
    if (error.status === 400) throw new BadRequestException(error.message);
    if (error.status === 403) throw new ForbiddenException(error.message);
    throw new NotFoundException(error.message);
  }
}
