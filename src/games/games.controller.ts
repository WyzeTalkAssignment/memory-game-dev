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

  @Post()
  async createGame(@Body() createGameDto: CreateGameDto) {
    return await this.gamesService.createGame(createGameDto);
  }

  @Get(':sessionKey')
  async getGameState(@Param('sessionKey') sessionKey: string) {
    return await this.gamesService.getGameState(sessionKey);
  }

  @Post(':sessionKey/moves')
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
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number
  ) {
    if (limit && (limit < 1 || limit > 50)) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }
    if (page && page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    return await this.gamesService.getGameHistory(sessionKey, limit, page);
  }

  @Get()
  async getCompletedGames(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number
  ) {
    if (limit && (limit < 1 || limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (page && page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    return await this.gamesService.getCompletedGames(limit, page);
  }

  @Get(':sessionKey/moves/latest')
  async getLatestMoves(
    @Param('sessionKey') sessionKey: string,
    @Query('count', new DefaultValuePipe(5), ParseIntPipe) count?: number
  ) {
    if (count && (count < 1 || count > 20)) {
      throw new BadRequestException('Count must be between 1 and 20');
    }

    return await this.gamesService.getGameHistory(sessionKey, count, 1);
  }
}