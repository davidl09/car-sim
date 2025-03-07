# Multiplayer Car Simulator - https://carsim.davidlaeer.dev

A web-based multiplayer car simulator built with TypeScript, React, Three.js, and Socket.IO. The game features real-time multiplayer gameplay, procedurally generated worlds, and basic car customization in a Roblox-like aesthetic.

## Features

- **Real-time Multiplayer**: Play with friends in the same virtual world
- **Procedural World Generation**: Infinite world with cities and countryside areas
- **Car Customization**: Change your car's color
- **Physics-based Driving**: Simple but fun vehicle physics
- **Collision Detection**: Basic collision with buildings, trees, and other players
- **Cross-platform**: Works on browsers across desktop and mobile devices

## Project Structure

```
car-sim-2/
├── client/                # Frontend React application
│   ├── public/            # Static assets
│   └── src/               # Source code
│       ├── components/    # React components
│       │   ├── game/      # 3D game components
│       │   └── ui/        # User interface components
│       ├── store/         # State management with Zustand
│       ├── services/      # API services
│       ├── styles/        # CSS styles
│       └── utils/         # Utility functions
├── server/                # Backend Node.js server
│   └── src/               # Source code
│       ├── services/      # Server services
│       └── types/         # TypeScript types
└── shared/                # Shared code between client and server
    ├── types/             # Shared TypeScript interfaces
    └── utils/             # Shared utility functions
```

## Technologies Used

### Client
- React
- TypeScript
- Vite
- Three.js with @react-three/fiber
- Socket.IO Client
- Zustand for state management
- ESLint and Prettier

### Server
- Node.js
- Express
- Socket.IO
- TypeScript
- ts-node

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm (v7+)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/car-sim-2.git
cd car-sim-2
```

2. Install dependencies for both client and server:
```bash
npm run setup
```

### Development

Run both client and server in development mode:
```bash
npm run dev
```

- Client will be available at http://localhost:5173
- Server will be running at http://localhost:3000

### Building for Production

Build both client and server:
```bash
npm run build
```

### Running in Production

After building, start the server:
```bash
npm start
```

## Deployment

### Client
The client can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.). Remember to set the environment variables properly.

### Server
The server can be deployed to any Node.js hosting service (Heroku, DigitalOcean, AWS, etc.). Make sure to update the `.env.production` files accordingly.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for the 3D rendering
- Socket.IO for the real-time communication
- React and the entire open-source community
