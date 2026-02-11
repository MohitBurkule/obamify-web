# Obamify Web

A React/JavaScript port of the Obamify application - transform any image using pixel rearrangement algorithms.

## Features

- **Genetic & Optimal Algorithms**: Transform images using hill-climbing genetic algorithm or optimal Hungarian algorithm
- **Physics-Based Animation**: Watch pixels morph with realistic particle simulation
- **Drawing Mode**: Paint on canvas with real-time pixel rearrangement
- **GIF Recording**: Capture and download animated transformations
- **Preset System**: Load and manage pre-made transformations

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/       # React UI components
├── hooks/          # Custom React hooks
├── workers/         # Web Workers for heavy computation
├── simulation/      # Physics simulation engine
├── rendering/       # Canvas-based Voronoi rendering
├── utils/          # Utilities (image processing, math)
├── types/          # TypeScript type definitions
├── App.tsx         # Main application
└── main.tsx        # Entry point
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tooling
- **Tailwind CSS** - Styling
- **Canvas 2D API** - CPU-based rendering
- **Web Workers** - Off-main-thread computation

## Migration Notes

This is a complete port from Rust to JavaScript:

- All algorithms (Genetic, Hungarian) have been ported
- Physics simulation matches original behavior
- Drawing mode with real-time updates
- Canvas rendering replaces GPU shaders (simpler but slower)

## Performance

Canvas CPU rendering is slower than the Rust GPU approach. For better performance:

- Use lower resolutions for preview (256-512)
- Use Genetic algorithm instead of Optimal for large images
- Consider WebGL-based rendering for production use

## License

Same as original Obamify project.
