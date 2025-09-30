import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { plainToInstance } from 'class-transformer';
import { LeaderboardDto } from './dto/leader-board.dto';

export interface LeaderboardEntry {

  sessionKey: string;
  attempts: number;
  completionTime: number; 
  startTime: Date;
  endTime: Date;
  score?: number; 
}

export interface PlayerStats {

  totalGames: number;
  completedGames: number;
  bestAttempts: number | null;
  averageAttempts: number | null;
  bestCompletionTime: number | null;
  averageCompletionTime: number | null;
  successRate: number;
}

export interface Leaderboard {
  data: LeaderboardEntry[];
}

export interface LeaderboardFilter {

  minAttempts?: number;
  maxAttempts?: number;
  minCompletionTime?: number;
  maxCompletionTime?: number;
}

@Injectable()
export class LeaderboardService {

  private readonly MAX_LIMIT = 100;
  private readonly DEFAULT_LIMIT = 10;
  private readonly DEFAULT_PAGE = 1;

  constructor(@InjectModel(Game.name) private gameModel: Model<GameDocument>,) {}

  async getTopGames(): Promise<LeaderboardDto> {

    const page = 1;
    const limit = 5;
    const skip = (page - 1) * limit; 
    
    const filterQuery: any = { isCompleted: true };

    const [completedGames, total] = await Promise.all([
      this.gameModel
        .find(filterQuery)
        .select('sessionKey attempts startTime endTime')
        .sort({ attempts: 1, endTime: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.gameModel.countDocuments(filterQuery)
    ]);

    const topPlayers = completedGames.map((game) => {

      const completionTime = game.endTime.getTime() - game.startTime.getTime();
      const score = this.calculateScore(game.attempts, completionTime);
      
      return {
        sessionKey: game.sessionKey,
        attempts: game.attempts,
        completionTime,
        startTime: game.startTime,
        endTime: game.endTime,
        score,
      };
    });

    return plainToInstance(LeaderboardDto, {
      topPlayers
    });
  }

  // Simple scoring formula: whoever has lower attempts and faster time = higher score
  private calculateScore(attempts: number, completionTime: number): number {

    const attemptsScore = Math.max(0, 1000 - (attempts * 10));
    const timeScore = Math.max(0, 1000 - (completionTime / 1000)); // Convert ms to seconds
    return Math.round((attemptsScore + timeScore) / 2);
  }
}