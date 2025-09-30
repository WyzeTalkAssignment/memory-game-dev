import { IsNumber, IsOptional } from "class-validator";

export class LeaderboardFilterDto {
  @IsOptional()
  @IsNumber()
  minAttempts?: number;

  @IsOptional()
  @IsNumber()
  maxAttempts?: number;

  @IsOptional()
  @IsNumber()
  minCompletionTime?: number;

  @IsOptional()
  @IsNumber()
  maxCompletionTime?: number;
}