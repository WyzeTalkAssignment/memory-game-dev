import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument } from '../games/schemas/game.schema';

export interface LeaderboardEntry {
  sessionKey: string;
  attempts: number;
  completionTime: number; // in milliseconds
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
  ) {}

  async getTopGames(limit: number = 5): Promise<LeaderboardEntry[]> {
    const completedGames = await this.gameModel
      .find({ isCompleted: true })
      .sort({ attempts: 1, endTime: 1 }) // Sort by attempts first, then by completion time
      .limit(limit)
      .exec();

    return completedGames.map((game) => ({
      sessionKey: game.sessionKey,
      attempts: game.attempts,
      completionTime: game.endTime.getTime() - game.startTime.getTime(),
      startTime: game.startTime,
      endTime: game.endTime,
    }));
  }

  async getPlayerStats(sessionKey: string): Promise<{
    totalGames: number;
    completedGames: number;
    bestAttempts: number | null;
    averageAttempts: number | null;
  }> {
    const allGames = await this.gameModel.find({ sessionKey });
    const completedGames = allGames.filter(game => game.isCompleted);
    
    const bestAttempts = completedGames.length > 0 
      ? Math.min(...completedGames.map(g => g.attempts))
      : null;
      
    const averageAttempts = completedGames.length > 0
      ? completedGames.reduce((sum, g) => sum + g.attempts, 0) / completedGames.length
      : null;

    return {
      totalGames: allGames.length,
      completedGames: completedGames.length,
      bestAttempts,
      averageAttempts: averageAttempts ? Math.round(averageAttempts * 100) / 100 : null,
    };
  }
}