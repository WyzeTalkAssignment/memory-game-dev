import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameDocument, Card, GameMove } from './schemas/game.schema';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

@Injectable()
export class GamesService {

  private readonly animals = [
    'Dog', 'Cat', 'Elephant', 'Lion', 'Tiger', 'Bear', 'Rabbit', 'Horse'
  ];

  private readonly positions = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4', 
    'C1', 'C2', 'C3', 'C4',
    'D1', 'D2', 'D3', 'D4'
  ];

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
  ) {}

  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const sessionKey = createGameDto.sessionKey || uuidv4();
    
    // Check if game with this session key already exists and is not completed
    const existingGame = await this.gameModel.findOne({ 
      sessionKey, 
      isCompleted: false 
    });
    
    if (existingGame) {
      throw new BadRequestException('Existing game already exists for this session');
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

    return await game.save();
  }

  async findGame(sessionKey: string): Promise<Game> {
    const game = await this.gameModel.findOne({ sessionKey });
    
    if (!game) {

      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async makeMove(sessionKey: string, makeMoveDto: MakeMoveDto): Promise<{
    isMatch: boolean;
    animals: string[];
    gameCompleted: boolean;
    message: string;
  }> {
    const game = await this.findGame(sessionKey) as GameDocument;;
    
    if (game.isCompleted) {
      throw new BadRequestException('Game is already completed');
    }

    const { cards: positions } = makeMoveDto;
    
    // Validate positions
    if (positions[0] === positions[1]) {

      throw new BadRequestException('Cannot select the same card twice');
    }

    // Check if cards are already matched
    const card1 = game.cards.find(c => c.position === positions[0]);
    const card2 = game.cards.find(c => c.position === positions[1]);
    
    if (!card1 || !card2) {

      throw new BadRequestException('Invalid card positions');
    }
    
    if (card1.isMatched || card2.isMatched) {
      throw new BadRequestException('Cannot select already matched cards');
    }

    const animals = [card1.animal, card2.animal];
    const isMatch = card1.animal === card2.animal;
    
    // Create a move record on mongo
    const move: GameMove = {
      cards: positions,
      animals,
      isMatch,
      timestamp: new Date(),
    };
    
    game.moves.push(move);
    game.attempts += 1;

    if (isMatch) {
      card1.isMatched = true;
      card2.isMatched = true;
      game.matchedPairs.push([positions[0], positions[1]]);
      
      const allMatched = game.cards.every(card => card.isMatched);
      if (allMatched) {
        game.isCompleted = true;
        game.endTime = new Date();
      }
    }

    await game.save();

    const message = isMatch 
      ? `Match found! ${animals[0]} pairs matched.`
      : `No match. ${animals[0]} and ${animals[1]} don't match.`;

    return {
      isMatch,
      animals,
      gameCompleted: game.isCompleted,
      message,
    };
  }
  
// check chache first  then mongo
  async getGameState(sessionKey: string): Promise<{

    sessionKey: string;
    attempts: number;
    matchedPairs: string[][];
    isCompleted: boolean;
    startTime: Date;
    endTime?: Date;
    revealedCards: { position: string; animal: string }[];
  }> {

    const game = await this.findGame(sessionKey);
    
    // Only show animals for matched cards
    const revealedCards = game.cards
      .filter(card => card.isMatched)
      .map(card => ({ position: card.position, animal: card.animal }));

    return {
      
      sessionKey: game.sessionKey,
      attempts: game.attempts,
      matchedPairs: game.matchedPairs,
      isCompleted: game.isCompleted,
      startTime: game.startTime,
      endTime: game.endTime,
      revealedCards,
    };
  }

  private createShuffledCards(): Card[] {
    const animalPairs = [...this.animals, ...this.animals];
    
    // Shuffle
    for (let i = animalPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [animalPairs[i], animalPairs[j]] = [animalPairs[j], animalPairs[i]];
    }

    // Create cards with positions
    return this.positions.map((position, index) => ({
      id: uuidv4(),
      animal: animalPairs[index],
      position,
      isMatched: false,
      isRevealed: false,
    }));
  }
}