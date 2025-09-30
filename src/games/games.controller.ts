import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  Query, 
  HttpCode, 
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';

/**
 * Controller responsible for handling game-related HTTP requests
 * 
 * @remarks
 * This controller provides endpoints for game lifecycle management including:
 * - Game creation and initialization
 * - Game state retrieval
 * - Move submission and validation
 * - Game history and analytics
 * 
 * All endpoints are validated and transformed using class-validator and class-transformer
 * *  
 */

@Controller('games')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GamesController {
  
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Creates a new memory game session
   * 
   * @remarks
   * Initializes a new game with randomized card positions and sets up
   * the game state. If no sessionKey is provided, one will be generated.
   * 
   * @param createGameDto - Data transfer object containing game initialization parameters
   * @returns A Promise that resolves to the created game state 
   */
  @Post('/start')
  async createGame(@Body() createGameDto: CreateGameDto) {
    return await this.gamesService.createGame(createGameDto);
  }

  
  /**
   * Retrieves the current state of a game session
   * 
   * @remarks
   * Returns the current game state including revealed cards, remaining pairs,
   * and game progress. Sensitive information like card positions is filtered out.
   * 
   * @param sessionKey - Unique identifier for the game session
   * @returns A Promise that resolves to the game state. Game moves have a default limit of 10 records per page
   * */
  @Get('/status/:sessionKey')
  async getGameState(@Param('sessionKey') sessionKey: string) {
    console.log(sessionKey)
     if (!sessionKey || sessionKey === '') {
        throw new BadRequestException('sessionKey is required');
    }
    return await this.gamesService.getGameState(sessionKey);
  }


  /**
   * Submits a move (card selection) in an active game
   * 
   * @remarks
   * Processes a player's move by selecting two cards. Validates the move,
   * checks for matches, updates game state, and determines if the game is completed.
   * 
   * @param sessionKey - Unique identifier for the game session
   * @param makeMoveDto - Data transfer object containing card positions to reveal
   * @returns A Promise that resolves to move result 
   */
  @Post('/submit')
  @HttpCode(HttpStatus.OK)
  async makeMove(
    @Body() makeMoveDto: MakeMoveDto,
  ) {
    return await this.gamesService.makeMove(makeMoveDto);
  }

   /**
   * Retrieves the move history for a game session
   * 
   * @remarks
   * Returns a paginated list of all moves made in the game session,
   * sorted by timestamp (most recent first).
   * 
   * @param sessionKey - Unique identifier for the game session
   * @param limit - Maximum number of moves to return (1-50, default: 10)
   * @returns A Promise that resolves to paginated move history
   */ 
  @Get('/history/:sessionKey')
  async getGameHistory(
   
    @Param('sessionKey') sessionKey: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
  ) {
    if (limit && (limit < 1 || limit > 50)) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }
    
    return await this.gamesService.getGameHistory(sessionKey, limit);
  }


}