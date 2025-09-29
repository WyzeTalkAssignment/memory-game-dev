import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesModule } from './games/games.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb+srv://thatodon_db_user:zeR6HTcCSu8Ou5dl@cluster0.12ajxnp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/memory-game'
    ),
  
    GamesModule,
    LeaderboardModule,
  ],
})
export class AppModule {}