import { IsOptional, IsString } from 'class-validator';

export class CreateGameDto {
  @IsOptional()
  @IsString()
  sessionKey?: string;

}