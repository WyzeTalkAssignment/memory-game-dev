import { Expose } from "class-transformer";
import { IsDate, IsNumber, IsOptional, IsString } from "class-validator";

export class LeaderboardDto {
  @Expose()
  @IsString()
  sessionKey: string;

  @Expose()
  @IsString()
  topPlayers:any[]

  @Expose()
  @IsNumber()
  attempts: number;

  @Expose()
  @IsNumber()
  completionTime: number;

  @Expose()
  @IsDate()
  startTime: Date;

  @Expose()
  @IsDate()
  endTime: Date;

  @Expose()
  @IsNumber()
  @IsOptional()
  score?: number;
}