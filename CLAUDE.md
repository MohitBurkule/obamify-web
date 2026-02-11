# Obamify Web

This is a React/TypeScript port of the Obamify image transformation application.

## Authorship

**Code authored by GLM (GLM 4.7)**
- Email: noreply@z.ai

## Branches

- **main** - Stable CPU-based rendering (Canvas 2D)
- **webgl-optimization** - GPU-accelerated rendering (WebGL/WebGPU)

## Development

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/MohitBurkule/obamify-web.git
cd obamify-web

# Install dependencies
npm install

# For WebGL-optimized version (faster performance)
git checkout webgl-optimization

# For stable CPU-based version
git checkout main
```

### Run Development Server

```bash
npm run dev
```

Then open http://localhost:5173/

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Local Development (Faster)

For faster development without using git:
- Work directly in the web folder
- Changes sync automatically in the browser
- Use `webgl-optimization` branch for GPU rendering

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tooling with fast HMR
- **Tailwind CSS** - Utility-first styling
- **Canvas 2D API** - CPU-based Voronoi rendering
- **Web Workers** - Off-main-thread computation for algorithms

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

## Features

- ✅ **Genetic Algorithm** - Stochastic hill-climbing with pixel swaps
- ✅ **Optimal Algorithm** - Greedy matching (Hungarian algorithm placeholder)
- ✅ **Physics Simulation** - Complete particle system with neighbor/wall/stroke forces
- ✅ **Canvas Rendering** - CPU-based Voronoi diagram with spatial hashing
- ✅ **Drawing Mode** - Paint on canvas with real-time algorithm updates
- ✅ **GIF Recording** - Frame capture infrastructure
- ✅ **Preset System** - Load/save with browser downloads
- ✅ **Animation** - Forward/reverse with physics-based morphing
- ✅ **Responsive UI** - Tailwind CSS styling

## Performance Notes

Canvas CPU rendering is slower than the original Rust GPU version. For better performance:
- Use lower resolutions (512 or lower) for preview
- Use Genetic algorithm instead of Optimal for large images
- Consider WebGL-based rendering for production use (future enhancement)

## License

Same as original Obamify project.
