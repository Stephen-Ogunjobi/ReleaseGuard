import type { CreateManualVerificationRequest } from "@release-guard/contracts";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateManualVerificationDto implements CreateManualVerificationRequest {
  @IsString()
  @IsNotEmpty()
  environmentId!: string;
}
