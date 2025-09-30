import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

export interface Card {
  id: string;
  animal: string;
  position: string; 
  isMatched: boolean;
  isRevealed: boolean;
}

export interface GameMove {
  cards: string[]; 
  animals: string[]; 
  isMatch: boolean;
  timestamp: Date;
}

@Schema({ timestamps: true })
export class Game {
  
  @Prop({ required: true, unique: true })
  sessionKey: string;

  @Prop({ required: false, type: Array })
  cards?: Card[]; 
  
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
  matchedPairs: string[][]; 
}

export const GameSchema = SchemaFactory.createForClass(Game);