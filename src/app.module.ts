import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesModule } from './games/games.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
     ConfigModule.forRoot(), 
     MongooseModule.forRoot(
        process.env.MONGODB_URI 
    ),
  
    GamesModule,
    LeaderboardModule,
  ],
})
export class AppModule {}