import { IsArray, ArrayMinSize, ArrayMaxSize, IsString, Matches, IsNotEmpty } from 'class-validator';

export class MakeMoveDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'Must select exactly 2 cards' })
  @ArrayMaxSize(2, { message: 'Must select exactly 2 cards' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(/^[A-D][1-4]$/, { each: true, message: 'Each card position must be in format A1, B2, C3, D4 etc.' })
  cards: string[];

  @IsString()
  sessionKey: string;
}