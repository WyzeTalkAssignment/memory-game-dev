import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GamesService, PaginatedGameHistory } from './games.service';
import { Game, GameDocument, Card, GameMove } from './schemas/game.schema';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

class MockGameModel {
  constructor(private data: any) {}

  save = jest.fn().mockResolvedValue(this.data);
}

const mockStaticMethods = {
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const createMockModel = () => {
  const model = function(data: any) {
    return new MockGameModel(data);
  };
  
  Object.assign(model, mockStaticMethods);
  return model;
};

const createMockGameDocument = (overrides: any = {}) => {
  const baseDocument = {
    sessionKey: 'test-session',
    isCompleted: false,
    endTime: undefined,
    cards: [
      { position: 'A1', animal: 'Dog', isMatched: false },
      { position: 'B1', animal: 'Dog', isMatched: false },
      { position: 'A2', animal: 'Cat', isMatched: false },
      { position: 'B2', animal: 'Cat', isMatched: false },
    ],
    moves: [],
    attempts: 0,
    matchedPairs: [],
    startTime: new Date(),
    save: jest.fn().mockResolvedValue(undefined),
  };

  return { ...baseDocument, ...overrides };
};

describe('GamesService', () => {
  let service: GamesService;
  let model: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const mockModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: getModelToken(Game.name),
          useValue: mockModel,
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
    const createGameDto: CreateGameDto = { sessionKey: 'test-session' };

    it('should create a new game with provided session key', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.createGame(createGameDto);

      expect(model.findOne).toHaveBeenCalledWith({
        sessionKey: 'test-session',
        isCompleted: false,
      });

      expect(result.sessionKey).toBe('test-session');
      expect(result.cards).toHaveLength(16);
      expect(result.isCompleted).toBe(false);
      expect(result.attempts).toBe(0);
      expect(result.moves).toEqual([]);
      expect(result.matchedPairs).toEqual([]);
    });

    it('should generate session key when not provided', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.createGame({});

      expect(result.sessionKey).toBeDefined();
      expect(result.sessionKey).toHaveLength(36); // UUID v4 
    });

  });

  describe('findGame', () => {
    it('should return game when found', async () => {
      const mockGame = createMockGameDocument();
      model.findOne.mockResolvedValue(mockGame);

      const result = await service.findGame('test-session');

      expect(result).toBe(mockGame);
      expect(model.findOne).toHaveBeenCalledWith({
        sessionKey: 'test-session',
      });
    });

    it('should throw NotFoundException when game not found', async () => {
      model.findOne.mockResolvedValue(null);

      await expect(service.findGame('non-existent'))
        .rejects.toThrow(NotFoundException);
      
      await expect(service.findGame('non-existent'))
        .rejects.toThrow('Game not found');
    });

    it('should validate session key format', async () => {
      await expect(service.findGame('')).rejects.toThrow(BadRequestException);
      await expect(service.findGame('   ')).rejects.toThrow(BadRequestException);
    });
  });

  describe('makeMove', () => {
    const sessionKey = 'test-session';
    const makeMoveDto: MakeMoveDto = { cards: ['A1', 'B1'] };

    it('should handle matching cards correctly', async () => {
      const mockGame = createMockGameDocument();
      model.findOne.mockResolvedValue(mockGame);

      const result = await service.makeMove(sessionKey, makeMoveDto);

      expect(result.isMatch).toBe(true);
      expect(result.animals).toEqual(['Dog', 'Dog']);
      expect(result.message).toContain('Match found');
      expect(result.matchedPositions).toEqual(['A1', 'B1']);
      expect(mockGame.attempts).toBe(1);
      expect(mockGame.moves).toHaveLength(1);
      expect(mockGame.save).toHaveBeenCalled();

      const recordedMove = mockGame.moves[0];
      expect(recordedMove.cards).toEqual(['A1', 'B1']);
      expect(recordedMove.animals).toEqual(['Dog', 'Dog']);
      expect(recordedMove.isMatch).toBe(true);
    });

    it('should handle non-matching cards correctly', async () => {
      const mockGame = createMockGameDocument();
      mockGame.cards[1].animal = 'Cat'; // Make B1 a different animal
      model.findOne.mockResolvedValue(mockGame);

      const result = await service.makeMove(sessionKey, { cards: ['A1', 'B1'] });

      expect(result.isMatch).toBe(false);
      expect(result.animals).toEqual(['Dog', 'Cat']);
      expect(result.message).toContain('No match');
      expect(result.matchedPositions).toBeUndefined();
      expect(mockGame.attempts).toBe(1);
      expect(mockGame.moves).toHaveLength(1);
      expect(mockGame.save).toHaveBeenCalled();
    });

    it('should complete game when all cards are matched', async () => {
      const mockGame = createMockGameDocument();

      // Mark all other cards as matched except A1 and B1
      mockGame.cards[2].isMatched = true;
      mockGame.cards[3].isMatched = true;
      model.findOne.mockResolvedValue(mockGame);

      const result = await service.makeMove(sessionKey, makeMoveDto);

      expect(result.gameCompleted).toBe(true);
      expect(mockGame.isCompleted).toBe(true);
      expect(mockGame.endTime).toBeDefined();
      expect(mockGame.save).toHaveBeenCalled();
    });

    it('should throw error for same card selection', async () => {
      const mockGame = createMockGameDocument();
      model.findOne.mockResolvedValue(mockGame);

      await expect(service.makeMove(sessionKey, { cards: ['A1', 'A1'] }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid card positions', async () => {
      const mockGame = createMockGameDocument();
      model.findOne.mockResolvedValue(mockGame);

      await expect(service.makeMove(sessionKey, { cards: ['A1', 'E5'] }))
        .rejects.toThrow(BadRequestException);
      
      await expect(service.makeMove(sessionKey, { cards: ['A1', 'Z9'] }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error for already matched cards', async () => {
      const mockGame = createMockGameDocument();
      mockGame.cards[0].isMatched = true; // A1 is already matched
      model.findOne.mockResolvedValue(mockGame);

      await expect(service.makeMove(sessionKey, makeMoveDto))
        .rejects.toThrow(BadRequestException);
    });

  });

  describe('getGameState', () => {
    const sessionKey = 'test-session';

    it('should return game state with revealed cards', async () => {
      const mockGame = createMockGameDocument();
      mockGame.attempts = 5;
      mockGame.matchedPairs = [['A1', 'B1']];
      mockGame.cards[0].isMatched = true;
      mockGame.cards[1].isMatched = true;
      
      model.findOne.mockResolvedValue(mockGame);

      const result = await service.getGameState(sessionKey);

      expect(result.sessionKey).toBe(sessionKey);
      expect(result.attempts).toBe(5);
      expect(result.matchedPairs).toEqual([['A1', 'B1']]);
      expect(result.isCompleted).toBe(false);
      expect(result.revealedCards).toHaveLength(2);
      expect(result.revealedCards[0]).toEqual({ position: 'A1', animal: 'Dog' });
      expect(result.revealedCards[1]).toEqual({ position: 'B1', animal: 'Dog' });
      expect(result.remainingCards).toBe(2);
    });

    it('should handle completed game state', async () => {
      const mockGame = createMockGameDocument({
        isCompleted: true,
        endTime: new Date('2024-01-01T10:05:00Z'),
      });
      mockGame.cards.forEach(card => card.isMatched = true);
      mockGame.attempts = 12;
      
      model.findOne.mockResolvedValue(mockGame);

      const result = await service.getGameState(sessionKey);

      expect(result.isCompleted).toBe(true);
      expect(result.endTime).toBeDefined();
      expect(result.remainingCards).toBe(0);
      expect(result.attempts).toBe(12);
      expect(result.revealedCards).toHaveLength(4);
    });

    
  });

  describe('getGameHistory', () => {
    const sessionKey = 'test-session';

    it('should return paginated game history', async () => {
      const mockMoves: GameMove[] = [
        { cards: ['A1', 'B1'], animals: ['Dog', 'Dog'], isMatch: true, timestamp: new Date('2024-01-01T10:00:00Z') },
        { cards: ['A2', 'B2'], animals: ['Cat', 'Cat'], isMatch: true, timestamp: new Date('2024-01-01T10:01:00Z') },
        { cards: ['A3', 'B3'], animals: ['Lion', 'Tiger'], isMatch: false, timestamp: new Date('2024-01-01T10:02:00Z') },
      ];

      const mockGame = createMockGameDocument({ moves: mockMoves });
      model.findOne.mockResolvedValue(mockGame);

      const result: PaginatedGameHistory = await service.getGameHistory(sessionKey, 2, 1);

      expect(result.moves).toHaveLength(2);
      expect(result.moves[0].cards).toEqual(['A1', 'B1']);
      expect(result.moves[1].cards).toEqual(['A2', 'B2']);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });


  });


  describe('validation methods', () => {
    describe('validateCardPositions', () => {
      it('should accept valid card positions', () => {
        const validateCardPositions = (service as any).validateCardPositions.bind(service);
        const mockGame = {
          cards: [
            { position: 'A1', animal: 'Dog' },
            { position: 'B1', animal: 'Cat' },
          ],
        };

        expect(() => validateCardPositions(['A1', 'B1'], mockGame)).not.toThrow();
        expect(() => validateCardPositions(['D4', 'C2'], mockGame)).not.toThrow();
      });

      it('should throw error for invalid number of cards', () => {
        const validateCardPositions = (service as any).validateCardPositions.bind(service);
        const mockGame = { cards: [] };

        expect(() => validateCardPositions(['A1'], mockGame))
          .toThrow('Must select exactly 2 cards');
        
        expect(() => validateCardPositions(['A1', 'B1', 'C1'], mockGame))
          .toThrow('Must select exactly 2 cards');
      });

      it('should throw error for same card selection', () => {
        const validateCardPositions = (service as any).validateCardPositions.bind(service);
        const mockGame = { cards: [] };

        expect(() => validateCardPositions(['A1', 'A1'], mockGame))
          .toThrow('Cannot select the same card twice');
      });

    
    });

    describe('validatePaginationParams', () => {
      it('should accept valid pagination parameters', () => {
        const validatePaginationParams = (service as any).validatePaginationParams.bind(service);

        expect(() => validatePaginationParams(10, 1)).not.toThrow();
        expect(() => validatePaginationParams(1, 100)).not.toThrow();
        expect(() => validatePaginationParams(50, 3)).not.toThrow();
      });

      it('should throw error for invalid limit', () => {
        const validatePaginationParams = (service as any).validatePaginationParams.bind(service);

        expect(() => validatePaginationParams(0, 1))
          .toThrow('Limit must be between 1 and 100');
        
        expect(() => validatePaginationParams(101, 1))
          .toThrow('Limit must be between 1 and 100');
        
        expect(() => validatePaginationParams(-5, 1))
          .toThrow('Limit must be between 1 and 100');
      });

      it('should throw error for invalid page', () => {
        const validatePaginationParams = (service as any).validatePaginationParams.bind(service);

        expect(() => validatePaginationParams(10, 0))
          .toThrow('Page must be greater than 0');
        
        expect(() => validatePaginationParams(10, -1))
          .toThrow('Page must be greater than 0');
      });

      it('should throw error for non-integer values', () => {
        const validatePaginationParams = (service as any).validatePaginationParams.bind(service);

        expect(() => validatePaginationParams(10.5, 1))
          .toThrow('Limit and page must be integers');
        
        expect(() => validatePaginationParams(10, 1.5))
          .toThrow('Limit and page must be integers');
      });
    });
  });
});