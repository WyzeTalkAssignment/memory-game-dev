import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameDocument, Card, GameMove } from './schemas/game.schema';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

export interface PaginatedGameHistory {
  moves: GameMove[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class GamesService {
  private readonly animals = [
    'Dog', 'Cat', 'Elephant', 'Lion', 'Tiger', 'Bear', 'Rabbit', 'Horse'
  ];

  private readonly validPositions = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4', 
    'C1', 'C2', 'C3', 'C4',
    'D1', 'D2', 'D3', 'D4'
  ];

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
  ) {}


  // Service method to start a new game, sessionKey optional/auto-generated
  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const sessionKey = createGameDto.sessionKey || uuidv4();
    
    if (createGameDto.sessionKey) {
      this.validateSessionKey(createGameDto.sessionKey);
    }
    
    const existingGame = await this.gameModel.findOne({ 
      sessionKey, 
      isCompleted: false 
    });
    
    if (existingGame) {
      throw new BadRequestException('Active game already exists for this session');
    }

    const shuffledCards = this.createShuffledCards();
    
    const game = new this.gameModel({
      sessionKey,
      cards: shuffledCards,
      moves: [],
      attempts: 0,
      startTime: new Date(),
      isCompleted: false,
      matchedPairs: [],
    });
    
     await game.save();

    // Convert to object and remove sensitive fields including cards
      const gameObj = game.toObject();
      const { _id, __v, cards, ...cleanGame } = gameObj;
      
      return {
        ...cleanGame,
      };
  }

  // Service method to find a game by sessionKey 
  async findGame(sessionKey: string): Promise<Game> {
    this.validateSessionKey(sessionKey);
    
    const game = await this.gameModel.findOne({ sessionKey });
    
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  // Service metod to handle player making a move
async makeMove(sessionKey: string, makeMoveDto: MakeMoveDto): Promise<{
  isMatch: boolean;
  animals: string[];
  gameCompleted: boolean;
  message: string;
  matchedPositions?: string[];
}> {
  this.validateSessionKey(sessionKey);
  
  const game = await this.findGame(sessionKey) as GameDocument;
  
  if (game.isCompleted) {
    throw new BadRequestException('Game is already completed');
  }

  const { cards: positions } = makeMoveDto;
  
  this.validateCardPositions(positions, game);

  const card1 = game.cards.find(c => c.position === positions[0]);
  const card2 = game.cards.find(c => c.position === positions[1]);
  
  if (!card1 || !card2) {
    throw new BadRequestException('Invalid card positions');
  }
  
  if (card1.isMatched || card2.isMatched) {
    throw new BadRequestException('Cannot select already matched cards');
  }

  // REVEAL the cards for this move
  card1.isRevealed = true;
  card2.isRevealed = true;

  const animals = [card1.animal, card2.animal];
  const isMatch = card1.animal === card2.animal;
  
  const move: GameMove = {
    cards: positions,
    animals,
    isMatch,
    timestamp: new Date(),
  };
  
  game.moves.push(move);
  game.attempts += 1;

  let matchedPositions: string[] = [];

  if (isMatch) {
    // Cards stay revealed and are marked as matched

    card1.isMatched = true;
    card2.isMatched = true;
    game.matchedPairs.push([positions[0], positions[1]]);
    matchedPositions = [positions[0], positions[1]];
    
    const allMatched = game.cards.every(card => card.isMatched);
    if (allMatched) {
      game.isCompleted = true;
      game.endTime = new Date();
    }
  } 

  game.markModified('cards');
  game.markModified('moves');
  game.markModified('matchedPairs');
  await game.save();

  const message = isMatch ? `Match found! ${animals[0]} pairs matched.` : `No match. ${animals[0]} and ${animals[1]} don't match.`;

  return {
    isMatch,
    animals,
    gameCompleted: game.isCompleted,
    message,
    ...(isMatch && { matchedPositions })
  };
}

  async getGameState(sessionKey: string): Promise<{
  sessionKey: string;
  attempts: number;
  matchedPairs: string[][];
  isCompleted: boolean;
  startTime: Date;
  endTime?: Date;
  revealedCards: { position: string; animal: string }[];
  remainingCards: number;
}> {
  this.validateSessionKey(sessionKey);

  const game = await this.findGame(sessionKey);

  const revealedCards = game.cards
    .filter(card => card.isMatched || card.isRevealed)
    .map(card => ({ 
      position: card.position, 
      animal: card.animal 
    }));

  const remainingCards = game.cards.filter(card => !card.isMatched).length;

  return {
    sessionKey: game.sessionKey,
    attempts: game.attempts,
    matchedPairs: game.matchedPairs,
    isCompleted: game.isCompleted,
    startTime: game.startTime,
    endTime: game.endTime,
    revealedCards, 
    remainingCards,
  };
}

  async getGameHistory(
    sessionKey: string, 
    limit: number = 10
  ): Promise<PaginatedGameHistory> {
    const page = 1;
    this.validateSessionKey(sessionKey);
    this.validatePaginationParams(limit, page);

    const game = await this.findGame(sessionKey);
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMoves = game.moves.slice(startIndex, endIndex);
    const totalMoves = game.moves.length;
    const totalPages = Math.ceil(totalMoves / limit);

    return {
      moves: paginatedMoves,
      pagination: {
        page,
        limit,
        total: totalMoves,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getCompletedGames(
    limit: number = 10,
    page: number = 1
  ): Promise<{
    games: Game[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    this.validatePaginationParams(limit, page);

    const skip = (page - 1) * limit;
    
    const [games, total] = await Promise.all([
      this.gameModel
        .find({ isCompleted: true })
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.gameModel.countDocuments({ isCompleted: true })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      games,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  private createShuffledCards(): Card[] {
    const animalPairs = [...this.animals, ...this.animals];
    
    // shuffle
    for (let i = animalPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [animalPairs[i], animalPairs[j]] = [animalPairs[j], animalPairs[i]];
    }

    return this.validPositions.map((position, index) => ({
      id: uuidv4(),
      animal: animalPairs[index],
      position,
      isMatched: false,
      isRevealed: false,
    }));
  }

  private validateCardPositions(positions: string[], game: Game): void {
    if (positions.length !== 2) {
      throw new BadRequestException('Must select exactly 2 cards');
    }

    if (positions[0] === positions[1]) {
      throw new BadRequestException('Cannot select the same card twice');
    }

    const positionRegex = /^[A-D][1-4]$/;
    if (!positionRegex.test(positions[0]) || !positionRegex.test(positions[1])) {
      throw new BadRequestException('Card positions must be in in the range A - D, 1 - 4.');
    }

    // Check if positions exist in the game
    const validPositionsSet = new Set(this.validPositions);
    if (!validPositionsSet.has(positions[0]) || !validPositionsSet.has(positions[1])) {
      throw new BadRequestException('Invalid card positions');
    }
  }

  private validateSessionKey(sessionKey: string): void {
    if (!sessionKey || sessionKey.trim().length === 0) {
      throw new BadRequestException('Session key is required');
    }

  }

  private validatePaginationParams(limit: number, page: number): void {
    if (limit <= 0 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (page <= 0) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (!Number.isInteger(limit) || !Number.isInteger(page)) {
      throw new BadRequestException('Limit and page must be integers');
    }
  }
  
}