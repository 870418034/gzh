import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  CreateIndustryPopularItemSchema,
  ImportIndustryPopularItemsSchema,
  ListIndustryPopularItemsQuerySchema,
} from "./industry-popular.dto";
import type {
  CreateIndustryPopularItemDto,
  ImportIndustryPopularItemsDto,
} from "./industry-popular.dto";
import { IndustryPopularService } from "./industry-popular.service";

function mustUserId(userId?: string) {
  if (!userId) throw new UnauthorizedException("X_USER_ID_REQUIRED");
  return userId;
}

@Controller("industry-popular")
export class IndustryPopularController {
  constructor(private svc: IndustryPopularService) {}

  @Get("items")
  list(@Headers("x-user-id") userId?: string, @Query() query?: any) {
    const q = ListIndustryPopularItemsQuerySchema.parse(query ?? {});
    return this.svc.list(mustUserId(userId), q);
  }

  @Post("items")
  create(
    @Headers("x-user-id") userId?: string,
    @Body(new ZodValidationPipe(CreateIndustryPopularItemSchema))
    dto?: CreateIndustryPopularItemDto,
  ) {
    return this.svc.create(mustUserId(userId), dto!);
  }

  @Post("import")
  import(
    @Headers("x-user-id") userId?: string,
    @Body(new ZodValidationPipe(ImportIndustryPopularItemsSchema))
    dto?: ImportIndustryPopularItemsDto,
  ) {
    return this.svc.importBulk(mustUserId(userId), dto!.items);
  }

  @Delete("items/:id")
  remove(@Headers("x-user-id") userId?: string, @Param("id") id?: string) {
    return this.svc.remove(mustUserId(userId), id!);
  }
}

