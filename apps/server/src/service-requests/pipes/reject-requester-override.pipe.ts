import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import { hasRequesterOverride } from "./reject-requester-override.util";

/** Reject client attempts to set requester identity; JWT subject is authoritative. */
@Injectable()
export class RejectRequesterOverridePipe implements PipeTransform {
  transform(value: unknown) {
    if (hasRequesterOverride(value)) {
      throw new BadRequestException(
        "Requester is taken from the authenticated session",
      );
    }
    return value;
  }
}
