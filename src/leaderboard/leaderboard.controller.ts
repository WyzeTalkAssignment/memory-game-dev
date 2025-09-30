import { 
  Controller, 
  Get,
  UsePipes,
  ValidationPipe 
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class LeaderboardController {
  
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
  ) {
   
    return await this.leaderboardService.getTopGames();
  }


}