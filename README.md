# Kids Memory Game API

REST API for a kids memory card game built with NestJS, TypeScript, and MongoDB. The game features a 4x4 grid of animal cards that players must match in pairs with the fewest attempts possible.

Author: Chris Masina (WyzeTalk Assignment)

##  Game Overview

The memory game works as follows:

- 16 cards (8 pairs of animals) are shuffled and laid face down in a 4x4 grid
- Cards are positioned using column letters (A-D) and row numbers (1-4)
- Players flip 2 cards per turn to find matching pairs
- Matched pairs are removed from the game
- The goal is to match all pairs with the fewest attempts
- Game completion time is tracked for leaderboard tiebreaking


##  Features

- **Game Management**: Start new games with unique session key
- **Gameplay**: Submit cards and receive match results
- **Game State Persistence**: MongoDB  with full game history
- **Leaderboard System**: Top 5 games ranked by attempts and completion time
- **Containerized Deployment**: Docker and Docker Compose support
- **Comprehensive Testing**: Unit tests with good coverage

## 🛠 Technology Stack

- **Framework**: NestJS with TypeScript

- **Database**: MongoDB with Mongoose ODM. 

MONGODB_URI=mongodb://localhost:27017/memory-game

- **Ideal Production setup**: 

In PROD we would spin up a pod in a k8s cluster. To reduce the load on MongoDB, promote horizontal scaling and speed up the game, we would impl CacheModule and store game state externally in a shared redis cache in the cluster. 

- **Testing**: Jest with comprehensive unit tests

- **Containerization**: Docker with automated build (docker-compose)

- **I added a Github actions continuos integration for cloud deployment**: Configured to listen to pushes on 'master' branch 
to kick off a build, create docker image and create artifact on github packages, and live logs available on:

https://github.com/WyzeTalkAssignment/memory-game-dev/actions/workflows/build-workflow.yml

- **Process Management**: PM2 for production deployment

Added performance tweak - pagination support for front-end


##  API Endpoints

### Games

#### Start New Game
```http
POST /games/start
Content-Type: application/json

{
  "sessionKey": "optional-custom-key"
}
```

**Response:**
```json
{
    "sessionKey": "d456781",
    "moves": [
    ],
    "attempts": 0,
    "startTime": "2025-09-30T06:24:03.516Z",
    "isCompleted": false,
    "matchedPairs": [
    ],
    "createdAt": "2025-09-30T06:24:03.534Z",
    "updatedAt": "2025-09-30T06:24:03.534Z"
}
```


#### Make a move

```http
POST /games/d456781/submit
Content-Type: application/json

{
  "cards": ["D2", "B1"]
}
```

**Response:**
```json
{
    "isMatch": false,
    "animals": [
        "Rabbit",
        "Dog"
    ],
    "gameCompleted": false,
    "message": "No match. Rabbit and Dog don't match."
}


```

#### Get Game State
```http
GET /games/d456781/status
```

**Response:**
```json
{
    "sessionKey": "d456781",
    "attempts": 1,
    "matchedPairs": [
    ],
    "isCompleted": false,
    "startTime": "2025-09-30T08:33:16.423Z",
    "revealedCards": [
        {
            "position": "B1",
            "animal": "Dog"
        },
        {
            "position": "D2",
            "animal": "Rabbit"
        }
    ],
    "remainingCards": 16
}

```

#### Get Game History
The Limit set the nuumber of Game moves in one page

```http
GET games/d456781/history?limit=5
```

**Response:**
```json
{
    "moves": [
        {
            "cards": [
                "D2",
                "B1"
            ],
            "animals": [
                "Rabbit",
                "Dog"
            ],
            "isMatch": false,
            "timestamp": "2025-09-30T08:36:52.710Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 5,
        "total": 1,
        "totalPages": 1,
        "hasNext": false,
        "hasPrev": false
    }
}

```

### Leaderboard

#### Get Top Games
```http
GET /leaderboard?limit=5
```

**Response:**
```json
{
    "topPlayers": [
        {
            "sessionKey": "d456781",
            "attempts": 38,
            "completionTime": 4063919,
            "startTime": "2025-09-30T06:24:03.516Z",
            "endTime": "2025-09-30T07:31:47.435Z",
            "score": 310
        }
    ]
}


```

## Installation & Development

### Prerequisites
- Node.js 18+ 
- MongoDB
- Docker

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

##  Testing

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

## Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:

- **400 Bad Request**: Invalid card positions, game already completed, selecting same card twice
- **404 Not Found**: Game session not found
- **422 Unprocessable Entity**: Validation errors in request body
- **500 Internal Server Error**: Unexpected server errors

##  Production Deployment

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

- **Containerization**: Easy horizontal scaling with Docker

---

**Built with ❤️ using NestJS, TypeScript, and MongoDB**