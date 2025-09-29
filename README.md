# Kids Memory Game API

REST API for a kids memory card game built with NestJS, TypeScript, and MongoDB. The game features a 4x4 grid of animal cards that players must match in pairs with the fewest attempts possible.

Author: Chris Masina (WyzeTalk Assignment)

## 🎯 Game Overview

The memory game works as follows:
- 16 cards (8 pairs of animals) are shuffled and laid face down in a 4x4 grid
- Cards are positioned using column letters (A-D) and row numbers (1-4)
- Players flip 2 cards per turn to find matching pairs
- Matched pairs are removed from the game
- The goal is to match all pairs with the fewest attempts
- Game completion time is tracked for leaderboard tiebreaking

## 🚀 Features

- **Game Management**: Start new games with unique session key
- **Gameplay**: Submit cards and receive match results
- **Game State Persistence**: MongoDB  with full game history
- **Leaderboard System**: Top 5 games ranked by attempts and completion time
- **Player Statistics**: Individual player performance 
- **Input Validation**:  validation and error handling
- **Containerized Deployment**: Docker and Docker Compose support
- **Comprehensive Testing**: Unit tests with good coverage

## 🛠 Technology Stack

- **Framework**: NestJS with TypeScript

- **Database**: MongoDB with Mongoose ODM. I used a cloud-hosted (Atlas) instance to test, but ideal we would have a mongo instance in our cluster. if you prefer a local instance setup 

MONGODB_URI=mongodb://localhost:27017/memory-game

- **Database Production setup**: In PROD we will spin up a k8s service and them kubenette manage it.to reduce th load on MongoDB and promote horizontal scaling and speed up the game, we would impl a shared redis cache in the cluster

- **Validation**: class-validator and class-transformer
- **Testing**: Jest with comprehensive unit tests
- **Containerization**: Docker with multi-stage builds
- **Process Management**: PM2 for production deployment

## 📋 API Endpoints

### Games

#### Start New Game
```http
POST /games
Content-Type: application/json

{
  "sessionKey": "optional-custom-key"
}
```

**Response:**
```json
{
  "sessionKey": "gameId",
  "message": "New game started successfully!",
  "startTime": "2024-01-15T10:00:00.000Z"
}
```

#### Get Game State
```http
GET /games/:sessionKey
```

**Response:**
```json
{
  "sessionKey": "game-session-123",
  "attempts": 5,
  "matchedPairs": [["A1", "B2"], ["C3", "D4"]],
  "isCompleted": false,
  "startTime": "2024-01-15T10:00:00.000Z",
  "revealedCards": [
    {"position": "A1", "animal": "Dog"},
    {"position": "B2", "animal": "Dog"}
  ]
}
```

#### Make a Move
```http
POST /games/:sessionKey/moves
Content-Type: application/json

{
  "cards": ["A1", "B3"]
}
```

**Response:**
```json
{
  "isMatch": true,
  "animals": ["Dog", "Dog"],
  "gameCompleted": false,
  "message": "Match found! Dog pairs matched."
}
```

### Leaderboard

#### Get Top Games
```http
GET /leaderboard?limit=5
```

**Response:**
```json
[
  {
    "sessionKey": "best-player-123",
    "attempts": 8,
    "completionTime": 120000,
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:02:00.000Z"
  }
]
```

#### Get Player Statistics
```http
GET /leaderboard/player/:sessionKey
```

**Response:**
```json
{
  "totalGames": 10,
  "completedGames": 8,
  "bestAttempts": 12,
  "averageAttempts": 15.5
}
```

## 🏗 Installation & Development

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Docker (optional)

### Local Development

1. **Clone and setup:**
```bash
cd memory-game-api
npm install
```

2. **Environment setup:**
```bash
# Set MongoDB URI (optional, defaults to localhost)
export MONGODB_URI=mongodb://localhost:27017/memory-game
```

3. **Start development server:**
```bash
npm run start:dev
```

4. **Run tests:**
```bash
# Unit tests
npm test

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Docker Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Access the API:**
- API: http://localhost:3000
- MongoDB: localhost:27017

3. **View logs:**
```bash
docker-compose logs -f app
```

## 🎮 Game Rules & Validation

### Card Positions
Cards are positioned in a 4x4 grid:
```
A1  A2  A3  A4
B1  B2  B3  B4  
C1  C2  C3  C4
D1  D2  D3  D4
```

### Game Constraints
- Players must select exactly 2 cards per move
- Cannot select the same card twice in one move
- Cannot select already matched cards
- Invalid positions (outside A1-D4) are rejected
- Games cannot be modified after completion

### Animals Used
The game uses 8 different animals, each appearing exactly twice:
- Dog, Cat, Elephant, Lion, Tiger, Bear, Rabbit, Horse

## 🧪 Testing

The project includes comprehensive unit tests covering:

- **Game Service**: Game creation, move validation, state management
- **Leaderboard Service**: Rankings and player statistics  
- **Error Handling**: Invalid inputs and edge cases
- **Database Operations**: Mocking and validation

**Run the test suite:**
```bash
# All tests
npm test

# With coverage report
npm run test:cov

# Watch mode for development
npm run test:watch
```

## 📊 Database Schema

### Game Document
```typescript
{
  sessionKey: string;        // Unique game identifier
  cards: Card[];            // Array of shuffled cards
  moves: GameMove[];        // History of all moves
  attempts: number;         // Total number of attempts
  startTime: Date;          // Game start timestamp
  endTime?: Date;           // Game completion timestamp
  isCompleted: boolean;     // Game completion status
  matchedPairs: string[][]; // Array of matched position pairs
}
```

### Card Schema
```typescript
{
  id: string;           // Unique card identifier
  animal: string;       // Animal name (Dog, Cat, etc.)
  position: string;     // Grid position (A1, B2, etc.)
  isMatched: boolean;   // Whether card is matched
  isRevealed: boolean;  // Whether card is currently revealed
}
```

## 🔒 Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:

- **400 Bad Request**: Invalid card positions, game already completed, selecting same card twice
- **404 Not Found**: Game session not found
- **422 Unprocessable Entity**: Validation errors in request body
- **500 Internal Server Error**: Unexpected server errors

## 🚀 Production Deployment

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/memory-game
```

### Docker Production Build
```bash
# Build production image
docker build -t memory-game-api .

# Run with external MongoDB
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://your-mongo-host:27017/memory-game \
  memory-game-api
```

### Health Checks
The application includes Docker health checks and process monitoring:
- Endpoint health check on `/leaderboard`
- Automatic container restart on failure
- MongoDB connection monitoring

## 📈 Performance & Scalability

- **Database Indexing**: Optimized queries on sessionKey and completion status
- **Input Validation**: Early validation to prevent invalid database operations  
- **Error Handling**: Graceful degradation with informative error messages
- **Memory Management**: Efficient card shuffling and state management
- **Containerization**: Easy horizontal scaling with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using NestJS, TypeScript, and MongoDB**