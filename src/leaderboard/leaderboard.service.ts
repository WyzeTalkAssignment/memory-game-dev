import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game, GameDocument } from '../games/schemas/game.schema';

export interface LeaderboardEntry {
  sessionKey: string;
  attempts: number;
  completionTime: number; // milliseconds
  startTime: Date;
  endTime: Date;
  score?: number; // Combined score based on attempts and time
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

export interface PaginatedLeaderboard {
  data: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
  ) {}

  async getTopGames(
    limit: number = this.DEFAULT_LIMIT, 
    page: number = this.DEFAULT_PAGE,
    filter?: LeaderboardFilter
  ): Promise<PaginatedLeaderboard> {
    this.validatePaginationParams(limit, page);
    this.validateFilterParams(filter);

    const skip = (page - 1) * limit;
    
    const filterQuery: any = { isCompleted: true };
    if (filter?.minAttempts !== undefined) filterQuery.attempts = { ...filterQuery.attempts, $gte: filter.minAttempts };
    if (filter?.maxAttempts !== undefined) filterQuery.attempts = { ...filterQuery.attempts, $lte: filter.maxAttempts };

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

    let filteredGames = completedGames;
    if (filter?.minCompletionTime !== undefined || filter?.maxCompletionTime !== undefined) {
      filteredGames = completedGames.filter(game => {
        const completionTime = game.endTime.getTime() - game.startTime.getTime();
        if (filter.minCompletionTime !== undefined && completionTime < filter.minCompletionTime) return false;
        if (filter.maxCompletionTime !== undefined && completionTime > filter.maxCompletionTime) return false;
        return true;
      });
    }

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && totalPages > 0) {
      throw new BadRequestException(`Page ${page} exceeds total pages (${totalPages})`);
    }

    const data = filteredGames.map((game) => {
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

    const result = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return result;
  }

  async getPlayerStats(sessionKey: string): Promise<PlayerStats> {
    this.validateSessionKey(sessionKey);

    // Get all games for this sessionKey
    const games = await this.gameModel.find({ sessionKey });
    const completedGames = games.filter(game => game.isCompleted);

    const totalGames = games.length;
    const completedCount = completedGames.length;
    
    const bestAttempts = completedCount > 0 ? Math.min(...completedGames.map(g => g.attempts)) : null;
    
    const averageAttempts = completedCount > 0 ? completedGames.reduce((sum, g) => sum + g.attempts, 0) / completedCount : null;

    const bestCompletionTime = completedCount > 0 ? Math.min(...completedGames.map(g => g.endTime.getTime() - g.startTime.getTime())): null;

    const averageCompletionTime = completedCount > 0 ? completedGames.reduce((sum, g) => sum + (g.endTime.getTime() - g.startTime.getTime()), 0) / completedCount : null;

    const successRate = totalGames > 0 ? (completedCount / totalGames) * 100 : 0;

    return {
      totalGames,
      completedGames: completedCount,
      bestAttempts,
      averageAttempts: averageAttempts ? Math.round(averageAttempts * 100) / 100 : null,
      bestCompletionTime,
      averageCompletionTime: averageCompletionTime ? Math.round(averageCompletionTime) : null,
      successRate: Math.round(successRate)
    };
  }

 
  async getPlayerRank(sessionKey: string): Promise<{ rank: number; totalPlayers: number }> {
    this.validateSessionKey(sessionKey);

    const playerGame = await this.gameModel.findOne({ 
      sessionKey, 
      isCompleted: true 
    }).sort({ attempts: 1, endTime: 1 });

    if (!playerGame) {
      throw new BadRequestException('Player has no completed games');
    }

    const playersWithBetterScore = await this.gameModel.countDocuments({
      isCompleted: true,
      $or: [
        { attempts: { $lt: playerGame.attempts } },
        { 
          attempts: playerGame.attempts,
          endTime: { $lt: playerGame.endTime }
        }
      ]
    });

    const totalPlayers = await this.gameModel.countDocuments({ isCompleted: true });

    return {
      rank: playersWithBetterScore + 1,
      totalPlayers
    };
  }

  // For clients with no need for pagination
  async getTopGamesSimple(limit: number = 5): Promise<LeaderboardEntry[]> {
    this.validatePaginationParams(limit, 1);
    
    const result = await this.getTopGames(limit, 1);
    return result.data;
  }

  private validatePaginationParams(limit: number, page: number): void {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    if (limit > this.MAX_LIMIT) {
      throw new BadRequestException(`Limit cannot exceed ${this.MAX_LIMIT}`);
    }

    if (!Number.isInteger(page) || page <= 0) {
      throw new BadRequestException('Page must be a positive integer');
    }
  }

  private validateSessionKey(sessionKey: string): void {
    if (!sessionKey || typeof sessionKey !== 'string') {
      throw new BadRequestException('Session key must be a non-empty string');
    }

    if (sessionKey.trim().length === 0) {
      throw new BadRequestException('Session key cannot be empty or whitespace');
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionKey)) {
      throw new BadRequestException('Invalid session key format');
    }
  }

  private validateFilterParams(filter?: LeaderboardFilter): void {
    if (!filter) return;

    if (filter.minAttempts !== undefined && (!Number.isInteger(filter.minAttempts) || filter.minAttempts < 0)) {
      throw new BadRequestException('minAttempts must be a non-negative integer');
    }

    if (filter.maxAttempts !== undefined && (!Number.isInteger(filter.maxAttempts) || filter.maxAttempts < 0)) {
      throw new BadRequestException('maxAttempts must be a non-negative integer');
    }

    if (filter.minAttempts !== undefined && filter.maxAttempts !== undefined && filter.minAttempts > filter.maxAttempts) {
      throw new BadRequestException('minAttempts cannot be greater than maxAttempts');
    }

    if (filter.minCompletionTime !== undefined && filter.minCompletionTime < 0) {
      throw new BadRequestException('minCompletionTime must be non-negative');
    }

    if (filter.maxCompletionTime !== undefined && filter.maxCompletionTime < 0) {
      throw new BadRequestException('maxCompletionTime must be non-negative');
    }

    if (filter.minCompletionTime !== undefined && filter.maxCompletionTime !== undefined && 
        filter.minCompletionTime > filter.maxCompletionTime) {
      throw new BadRequestException('minCompletionTime cannot be greater than maxCompletionTime');
    }
  }

  private calculateScore(attempts: number, completionTime: number): number {
    // Simple scoring formula: whoever has lower attempts and faster time = higher score

    const attemptsScore = Math.max(0, 1000 - (attempts * 10));
    const timeScore = Math.max(0, 1000 - (completionTime / 1000)); // Convert ms to seconds
    return Math.round((attemptsScore + timeScore) / 2);
  }
}