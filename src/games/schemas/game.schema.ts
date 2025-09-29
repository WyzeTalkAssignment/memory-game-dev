import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

export interface Card {
  id: string;
  animal: string;
  position: string; // e.g., 'A1', 'B2'
  isMatched: boolean;
  isRevealed: boolean;
}

export interface GameMove {
  cards: string[]; // positions like ['A1', 'B2']
  animals: string[]; // the animal types revealed
  isMatch: boolean;
  timestamp: Date;
}

@Schema({ timestamps: true })
export class Game {
  
  @Prop({ required: true, unique: true })
  sessionKey: string;

  @Prop({ required: true, type: Array })
  cards: Card[];

  @Prop({ type: Array, default: [] })
  moves: GameMove[];

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: Date.now })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ type: Array, default: [] })
  matchedPairs: string[][]; // pairs of positions that are matched
}

export const GameSchema = SchemaFactory.createForClass(Game);