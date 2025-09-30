import { 
  Controller, 
  Get,
  UsePipes,
  ValidationPipe 
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';


/**
 * Controller responsible for handling leaderboard-related HTTP requests
 * 
 * @remarks
 * This controller provides endpoints for retrieving game leaderboard data
 * including top players, scores, and completion statistics.
 * 
 * @example
 * ```typescript
 * // GET /leaderboard
 * const leaderboard = await fetch('/leaderboard');
 * ```
 * 
 */
@Controller('leaderboard')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class LeaderboardController {
  
  constructor(private readonly leaderboardService: LeaderboardService) {}

    /**
   * Retrieves the top games leaderboard
   * 
   * @remarks
   * This endpoint returns a paginated list of top-performing games sorted by
   * score, including player statistics and completion metrics.
   *  * 
   */
  @Get()
  async getLeaderboard(
  ) {
    return await this.leaderboardService.getTopGames();
  }


}