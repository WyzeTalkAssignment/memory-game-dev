import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  ParseIntPipe, 
  DefaultValuePipe, 
  BadRequestException,
  UsePipes,
  ValidationPipe 
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

class LeaderboardQueryDto {
  limit?: number = 10;
  page?: number = 1;
  minAttempts?: number;
  maxAttempts?: number;
  minCompletionTime?: number; // in milliseconds
  maxCompletionTime?: number; // in milliseconds
}

@Controller('leaderboard')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class LeaderboardController {
  
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('minAttempts', ParseIntPipe) minAttempts?: number,
    @Query('maxAttempts', ParseIntPipe) maxAttempts?: number,
    @Query('minCompletionTime', ParseIntPipe) minCompletionTime?: number,
    @Query('maxCompletionTime', ParseIntPipe) maxCompletionTime?: number
  ) {
    if (limit && (limit < 1 || limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (page && page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    const filter = {
      ...(minAttempts !== undefined && { minAttempts }),
      ...(maxAttempts !== undefined && { maxAttempts }),
      ...(minCompletionTime !== undefined && { minCompletionTime }),
      ...(maxCompletionTime !== undefined && { maxCompletionTime }),
    };

    return await this.leaderboardService.getTopGames(limit, page, filter);
  }

  @Get('top')
  async getTopLeaderboard(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit?: number
  ) {
    if (limit && (limit < 1 || limit > 50)) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    return await this.leaderboardService.getTopGamesSimple(limit);
  }

  @Get('player/:sessionKey')
  async getPlayerStats(@Param('sessionKey') sessionKey: string) {
     if (sessionKey && (sessionKey === '')) {
      throw new BadRequestException('SessionKeycannot be empty');
    }
    return await this.leaderboardService.getPlayerStats(sessionKey);
  }

  @Get('player/:sessionKey/rank')
  async getPlayerRank(@Param('sessionKey') sessionKey: string) {
    return await this.leaderboardService.getPlayerRank(sessionKey);
  }

  @Get('filters')
  async getLeaderboardWithFilters(@Query() query: LeaderboardQueryDto) {
    const { limit, page, ...filter } = query;
    return await this.leaderboardService.getTopGames(limit, page, filter);
  }

}