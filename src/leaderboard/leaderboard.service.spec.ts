import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { LeaderboardService, PaginatedLeaderboard, PlayerStats, LeaderboardEntry } from './leaderboard.service';
import { Game, GameDocument } from '../games/schemas/game.schema';


const mockGameModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
};

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let model: Model<GameDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getModelToken(Game.name),
          useValue: mockGameModel,
        }
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    model = module.get<Model<GameDocument>>(getModelToken(Game.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTopGames', () => {
    const mockCompletedGames = [
      {
        sessionKey: 'uuid-1',
        attempts: 5,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:02:00Z'), // 2 minutes
        isCompleted: true,
      },
      {
        sessionKey: 'uuid-2',
        attempts: 8,
        startTime: new Date('2024-01-01T11:00:00Z'),
        endTime: new Date('2024-01-01T11:05:00Z'), // 5 minutes
        isCompleted: true,
      },
      {
        sessionKey: 'uuid-3',
        attempts: 12,
        startTime: new Date('2024-01-01T12:00:00Z'),
        endTime: new Date('2024-01-01T12:08:00Z'), // 8 minutes
        isCompleted: true,
      },
    ];

    beforeEach(() => {
      mockGameModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCompletedGames),
      });
      mockGameModel.countDocuments.mockResolvedValue(3);
    });

    it('should return paginated leaderboard with default values', async () => {
      const result = await service.getTopGames();

      expect(result.data).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
      
      expect(result.data[0].score).toBeDefined();
      expect(result.data[0].completionTime).toBe(120000); // 2 minutes in ms
    });

    it('should return paginated leaderboard with custom limit and page', async () => {
      mockGameModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockCompletedGames[0]]),
      });
      mockGameModel.countDocuments.mockResolvedValue(3);

      const result = await service.getTopGames(1, 2);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should throw error for invalid limit', async () => {
      await expect(service.getTopGames(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.getTopGames(101, 1)).rejects.toThrow(BadRequestException);
      await expect(service.getTopGames(1.5, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid page', async () => {
      await expect(service.getTopGames(10, 0)).rejects.toThrow(BadRequestException);
      await expect(service.getTopGames(10, 1.5)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when page exceeds total pages', async () => {
      mockGameModel.countDocuments.mockResolvedValue(5); // total games
      
      await expect(service.getTopGames(10, 2)).rejects.toThrow(BadRequestException);
    });

    
  });

  describe('getPlayerStats', () => {
    const sessionKey = '123e4567';
    
    it('should throw error for invalid session key', async () => {
      await expect(service.getPlayerStats('')).rejects.toThrow(BadRequestException);
      await expect(service.getPlayerStats('invalid-uuid')).rejects.toThrow(BadRequestException);
    });

  });

  describe('getTopGamesSimple', () => {
    it('should return simple leaderboard without pagination', async () => {
      const mockGames = [
        {
          sessionKey: 'uuid-1',
          attempts: 5,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:02:00Z'),
          isCompleted: true,
        },
      ];

      mockGameModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      });
      mockGameModel.countDocuments.mockResolvedValue(1);

      const result = await service.getTopGamesSimple(5);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].sessionKey).toBe('uuid-1');
      expect(result[0].score).toBeDefined();
    });

  });

  describe('validateFilterParams', () => {
    it('should accept valid filters', () => {
      expect(() => service['validateFilterParams']({ minAttempts: 5, maxAttempts: 10 })).not.toThrow();
      expect(() => service['validateFilterParams']({ minCompletionTime: 1000, maxCompletionTime: 5000 })).not.toThrow();
    });

    it('should throw error for invalid attempt filters', () => {
      expect(() => service['validateFilterParams']({ minAttempts: -1 })).toThrow(BadRequestException);
      expect(() => service['validateFilterParams']({ maxAttempts: -1 })).toThrow(BadRequestException);
      expect(() => service['validateFilterParams']({ minAttempts: 10, maxAttempts: 5 })).toThrow(BadRequestException);
    });

    it('should throw error for invalid completion time filters', () => {
      expect(() => service['validateFilterParams']({ minCompletionTime: -1000 })).toThrow(BadRequestException);
      expect(() => service['validateFilterParams']({ maxCompletionTime: -1000 })).toThrow(BadRequestException);
      expect(() => service['validateFilterParams']({ minCompletionTime: 5000, maxCompletionTime: 1000 })).toThrow(BadRequestException);
    });
  });

  describe('calculateScore', () => {
    it('should calculate score correctly', () => {
      const score = service['calculateScore'](10, 120000); // 10 attempts, 2 minutes

      // attemptsScore = 1000 - (10 * 10) = 900
      // timeScore = 1000 - (120000 / 1000) = 1000 - 120 = 880
      // average = (900 + 880) / 2 = 890
      expect(score).toBe(890);
    });

  
  });
});