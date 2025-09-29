import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGame(@Body() createGameDto: CreateGameDto) {
    const game = await this.gamesService.createGame(createGameDto);
    return {
      sessionKey: game.sessionKey,
      message: 'New game started successfully!',
      startTime: game.startTime,
    };
  }

  @Get(':sessionKey')
  async getGame(@Param('sessionKey') sessionKey: string) {
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
}