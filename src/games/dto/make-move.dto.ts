import { IsArray, ArrayMinSize, ArrayMaxSize, IsString, Matches } from 'class-validator';

export class MakeMoveDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @Matches(/^[A-D][1-4]$/, { each: true, message: 'Each card position must be in format like A1, B2, C3, D4' })
  cards: string[];
}