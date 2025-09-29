import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game, GameDocument } from './schemas/game.schema';

// Create a proper mock factory
const createMockGameModel = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  exec: jest.fn(),
});

describe('GamesService', () => {
  let service: GamesService;
  let model: Model<GameDocument>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;

  beforeEach(async () => {
    mockGameModel = createMockGameModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: getModelToken(Game.name),
          useValue: mockGameModel,
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    model = module.get<Model<GameDocument>>(getModelToken(Game.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGame', () => {
    it('should create a new game with shuffled cards', async () => {
      // Mock: No existing game found
      mockGameModel.findOne.mockResolvedValue(null);
      
      // Mock: New game save
      const mockSavedGame = {
        sessionKey: 'test-session',
        cards: [
          { position: 'A1', animal: 'Dog', isMatched: false },
          { position: 'A2', animal: 'Cat', isMatched: false },
          // ... more cards
        ],
        moves: [],
        attempts: 0,
        isCompleted: false,
        startTime: expect.any(Date),
        matchedPairs: [],
      };
      
      // For the new game creation, we need to mock the constructor behavior
      const mockGameInstance = {
        save: jest.fn().mockResolvedValue(mockSavedGame),
      };

      // Mock the model constructor
      (model as any).mockImplementation(() => mockGameInstance);

      const result = await service.createGame({ sessionKey: 'test-session' });

      expect(mockGameModel.findOne).toHaveBeenCalledWith({
        sessionKey: 'test-session',
        isCompleted: false,
      });
      expect(mockGameInstance.save).toHaveBeenCalled();
      expect(result.sessionKey).toBe('test-session');
      expect(result.cards).toHaveLength(16); // Should have 16 cards for 4x4 grid
    });

    it('should throw BadRequestException if active game exists', async () => {
      const existingGame = {
        sessionKey: 'test-session',
        isCompleted: false,
      };
      
      mockGameModel.findOne.mockResolvedValue(existingGame);

      await expect(service.createGame({ sessionKey: 'test-session' }))
        .rejects.toThrow(BadRequestException);
      
      await expect(service.createGame({ sessionKey: 'test-session' }))
        .rejects.toThrow('Existing game already exists for this session');
    });

    it('should generate UUID when no sessionKey provided', async () => {
      mockGameModel.findOne.mockResolvedValue(null);
      
      const mockSavedGame = {
        sessionKey: expect.any(String),
        cards: expect.any(Array),
        moves: [],
        attempts: 0,
        isCompleted: false,
        startTime: expect.any(Date),
        matchedPairs: [],
      };

      const mockGameInstance = {
        save: jest.fn().mockResolvedValue(mockSavedGame),
      };

      (model as any).mockImplementation(() => mockGameInstance);

      const result = await service.createGame({});

      expect(mockGameModel.findOne).toHaveBeenCalledWith({
        sessionKey: expect.any(String),
        isCompleted: false,
      });
      expect(result.sessionKey).toBeDefined();
      expect(result.sessionKey).toHaveLength(36); // UUID v4 length
    });
  });

  describe('findGame', () => {
    it('should return game if found', async () => {
      const mockGame = { 
        sessionKey: 'test-session',
        isCompleted: false 
      };
      mockGameModel.findOne.mockResolvedValue(mockGame);

      const result = await service.findGame('test-session');

      expect(mockGameModel.findOne).toHaveBeenCalledWith({
        sessionKey: 'test-session'
      });
      expect(result).toBe(mockGame);
    });

    it('should throw NotFoundException if game not found', async () => {
      mockGameModel.findOne.mockResolvedValue(null);

      await expect(service.findGame('non-existent'))
        .rejects.toThrow(NotFoundException);
      
      await expect(service.findGame('non-existent'))
        .rejects.toThrow('Game not found');
    });
  });

  describe('makeMove', () => {
    const createMockGame = () => ({
      sessionKey: 'test-session',
      isCompleted: false,
      cards: [
        { position: 'A1', animal: 'Dog', isMatched: false },
        { position: 'A2', animal: 'Dog', isMatched: false },
        { position: 'B1', animal: 'Cat', isMatched: false },
        { position: 'B2', animal: 'Cat', isMatched: false },
      ],
      moves: [],
      attempts: 0,
      matchedPairs: [],
      startTime: new Date(),
      save: jest.fn().mockImplementation(function() {
        return Promise.resolve(this);
      }),
    });

    it('should handle matching cards correctly', async () => {
      const mockGame = createMockGame();
      mockGameModel.findOne.mockResolvedValue(mockGame);

      const result = await service.makeMove('test-session', { 
        cards: ['A1', 'A2'] 
      });

      expect(result.isMatch).toBe(true);
      expect(result.animals).toEqual(['Dog', 'Dog']);
      expect(result.message).toContain('Match found');
      expect(mockGame.save).toHaveBeenCalled();
    });

    it('should handle non-matching cards correctly', async () => {
      const mockGame = createMockGame();
      mockGameModel.findOne.mockResolvedValue(mockGame);

      const result = await service.makeMove('test-session', { 
        cards: ['A1', 'B1'] 
      });

      expect(result.isMatch).toBe(false);
      expect(result.animals).toEqual(['Dog', 'Cat']);
      expect(result.message).toContain('No match');
      expect(mockGame.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for same card selection', async () => {
      const mockGame = createMockGame();
      mockGameModel.findOne.mockResolvedValue(mockGame);

      await expect(service.makeMove('test-session', { 
        cards: ['A1', 'A1'] 
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for completed game', async () => {
      const mockGame = createMockGame();
      mockGame.isCompleted = true;
      mockGameModel.findOne.mockResolvedValue(mockGame);

      await expect(service.makeMove('test-session', { 
        cards: ['A1', 'A2'] 
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already matched cards', async () => {
      const mockGame = createMockGame();
      mockGame.cards[0].isMatched = true; // A1 is already matched
      mockGameModel.findOne.mockResolvedValue(mockGame);

      await expect(service.makeMove('test-session', { 
        cards: ['A1', 'A2'] 
      })).rejects.toThrow(BadRequestException);
    });
  });
});