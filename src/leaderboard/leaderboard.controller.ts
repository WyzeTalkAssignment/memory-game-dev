import { Controller, Get, Param, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return await this.leaderboardService.getTopGames(limitNum);
  }

  @Get('player/:sessionKey')
  async getPlayerStats(@Param('sessionKey') sessionKey: string) {
    return await this.leaderboardService.getPlayerStats(sessionKey);
  }
}