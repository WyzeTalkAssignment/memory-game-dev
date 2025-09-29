import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesModule } from './games/games.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    MongooseModule.forRoot(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/memory-game'
    ),
  
    GamesModule,
    LeaderboardModule,
  ],
})
export class AppModule {}