import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaderboardService } from './leaderboard.service';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { LeaderboardDto } from 'src/games/dto/leader-board.dto';

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

    it('should return paginated leaderboard with top 5 games as DTO', async () => {
      const result: LeaderboardDto = await service.getTopGames();

      // Verify DTO structure
      expect(result.attempts).toHaveLength(3);
      
      // Verify content
      expect(result.attempts[0].sessionKey).toBe('uuid-1');
      expect(result.attempts[0].attempts).toBe(5);
      expect(result.attempts[0].completionTime).toBe(120000); // 2 minutes in ms
      expect(result.attempts[0].score).toBeDefined();
      expect(result.attempts[0].startTime).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.attempts[0].endTime).toEqual(new Date('2024-01-01T10:02:00Z'));
      
      // Verify sorting (best scores first)
      expect(result.attempts[0].attempts).toBeLessThan(result.attempts[1].attempts);
      expect(result.attempts[1].attempts).toBeLessThan(result.attempts[2].attempts);
    });

    it('should call database with correct query parameters', async () => {
      await service.getTopGames();

      expect(mockGameModel.find).toHaveBeenCalledWith({ isCompleted: true });
      expect(mockGameModel.find().select).toHaveBeenCalledWith('sessionKey attempts startTime endTime');
      expect(mockGameModel.find().sort).toHaveBeenCalledWith({ attempts: 1, endTime: 1 });
      expect(mockGameModel.find().skip).toHaveBeenCalledWith(0); // (1-1)*5 = 0
      expect(mockGameModel.find().limit).toHaveBeenCalledWith(5);
    });

    it('should handle empty leaderboard with proper DTO structure', async () => {
      mockGameModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      mockGameModel.countDocuments.mockResolvedValue(0);
      const result: LeaderboardDto = await service.getTopGames();

      expect(result.attempts).toHaveLength(0);
    });

    it('should calculate scores correctly in DTO', async () => {
      const result: LeaderboardDto = await service.getTopGames();

      // Test score calculation for first game (5 attempts, 120000ms)
      // attemptsScore = 1000 - (5 * 10) = 950
      // timeScore = 1000 - (120000 / 1000) = 1000 - 120 = 880
      // average = (950 + 880) / 2 = 915
      expect(result.attempts[0].score).toBe(915);

      // Test score calculation for second game (8 attempts, 300000ms)
      // attemptsScore = 1000 - (8 * 10) = 920
      // timeScore = 1000 - (300000 / 1000) = 1000 - 300 = 700
      // average = (920 + 700) / 2 = 810
      expect(result.attempts[1].score).toBe(810);

      // Test score calculation for third game (12 attempts, 480000ms)
      // attemptsScore = 1000 - (12 * 10) = 880
      // timeScore = 1000 - (480000 / 1000) = 1000 - 480 = 520
      // average = (880 + 520) / 2 = 700
      expect(result.attempts[2].score).toBe(700);
    });

    it('should return instances of proper DTO classes', async () => {
      const result: LeaderboardDto = await service.getTopGames();

      // Verify each entry has the expected properties 
      expect(result).toHaveProperty('sessionKey');
      expect(result).toHaveProperty('attempts');
      expect(result).toHaveProperty('completionTime');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('score');

    });
  });

  describe('calculateScore', () => {
    it('should calculate score correctly for various inputs', () => {
      const calculateScore = (service as any).calculateScore.bind(service);

      // Perfect score scenario
      expect(calculateScore(1, 1000)).toBeGreaterThan(900);

      // Average scenario
      expect(calculateScore(10, 60000)).toBe(470); // 10 attempts, 1 minute

      // Poor performance
      expect(calculateScore(50, 300000)).toBe(100); // 50 attempts, 5 minutes

      // Minimum score
      expect(calculateScore(100, 600000)).toBe(0);
    });

    it('should not return negative scores', () => {
      const calculateScore = (service as any).calculateScore.bind(service);
      
      expect(calculateScore(200, 1000000)).toBe(0);
    });
  });
});