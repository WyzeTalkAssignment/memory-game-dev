import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaderboardService } from './leaderboard.service';
import { Game, GameDocument } from '../games/schemas/game.schema';

// Create mock data first
const mockGameData = {
  sessionKey: 'session1',
  attempts: 10,
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T10:05:00Z'),
  isCompleted: true,
};

const mockGameData2 = {
  sessionKey: 'session2', 
  attempts: 12,
  startTime: new Date('2024-01-01T11:00:00Z'),
  endTime: new Date('2024-01-01T11:04:00Z'),
  isCompleted: true,
};

// Mock model
const mockGameModel = {
  find: jest.fn(),
  sort: jest.fn(),
  limit: jest.fn(),
  exec: jest.fn(),
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
        },
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
    it('should return top games sorted by attempts', async () => {
      const mockGames = [mockGameData, mockGameData2];

      mockGameModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockGames),
          }),
        }),
      });

      const result = await service.getTopGames(5);

      expect(mockGameModel.find).toHaveBeenCalledWith({ isCompleted: true });
      expect(result).toHaveLength(2);
      expect(result[0].attempts).toBe(10);
      expect(result[0].completionTime).toBe(5 * 60 * 1000); // 5 minutes
    });
  });

  describe('getPlayerStats', () => {
    it('should return correct player statistics', async () => {
      const mockGames = [
        { ...mockGameData, attempts: 10 },
        { ...mockGameData2, attempts: 15 },
        { isCompleted: false, attempts: 5 },
      ];

      mockGameModel.find.mockResolvedValue(mockGames);

      const result = await service.getPlayerStats('test-session');

      expect(result.totalGames).toBe(3);
      expect(result.completedGames).toBe(2);
      expect(result.bestAttempts).toBe(10);
      expect(result.averageAttempts).toBe(12.5);
    });

    it('should handle player with no games', async () => {
      mockGameModel.find.mockResolvedValue([]);

      const result = await service.getPlayerStats('new-session');

      expect(result.totalGames).toBe(0);
      expect(result.completedGames).toBe(0);
      expect(result.bestAttempts).toBe(null);
      expect(result.averageAttempts).toBe(null);
    });
  });
});