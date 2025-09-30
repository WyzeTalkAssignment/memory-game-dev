import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  Query, 
  HttpCode, 
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

@Controller('games')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GamesController {
  
  constructor(private readonly gamesService: GamesService) {}

  @Post('/start')
  async createGame(@Body() createGameDto: CreateGameDto) {
    return await this.gamesService.createGame(createGameDto);
  }

  @Get(':sessionKey/status')
  async getGameState(@Param('sessionKey') sessionKey: string) {
     if (!sessionKey || sessionKey === '') {
        throw new BadRequestException('sessionKey is required');
    }
    return await this.gamesService.getGameState(sessionKey);
  }

  @Post(':sessionKey/submit')
  @HttpCode(HttpStatus.OK)
  async makeMove(
    @Param('sessionKey') sessionKey: string,
    @Body() makeMoveDto: MakeMoveDto,
  ) {
    return await this.gamesService.makeMove(sessionKey, makeMoveDto);
  }

  @Get(':sessionKey/history')
  async getGameHistory(
    @Param('sessionKey') sessionKey: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
  ) {
    if (limit && (limit < 1 || limit > 50)) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }
    
    return await this.gamesService.getGameHistory(sessionKey, limit);
  }


}