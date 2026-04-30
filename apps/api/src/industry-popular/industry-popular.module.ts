import { Module } from "@nestjs/common";
import { IndustryPopularController } from "./industry-popular.controller";
import { IndustryPopularService } from "./industry-popular.service";

@Module({
  controllers: [IndustryPopularController],
  providers: [IndustryPopularService],
})
export class IndustryPopularModule {}

