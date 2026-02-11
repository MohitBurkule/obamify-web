# Running Obamify Web Locally

## Quick Start

```bash
cd /home/mohit/trashy/obamify/web
npm run dev
```

Then open: **http://localhost:5173/**

## That's It!

- **No Git** - Work directly with files
- **Auto-Reload** - Vite detects changes and reloads automatically
- **Fast Feedback** - See changes immediately in browser

## Troubleshooting

**If presets fail to load:**
1. Check that `/home/mohit/trashy/obamify/web/public/presets/` contains:
   - `wisetree/source.png`
   - `wisetree/assignments.json`
   - (etc. for each preset)

**If nothing appears:**
- Open browser console (F12) to see errors
- Check that all files are in `/home/mohit/trashy/obamify/web/src/`

## File Locations

```
/home/mohit/trashy/obamify/web/
├── src/           # Source code
├── public/        # Static assets
├── index.html      # HTML entry
├── package.json    # Dependencies
└── vite.config.ts  # Build config
```

## Tips

1. **Edit files directly** - Changes appear instantly via HMR
2. **Use browser DevTools** - React DevTools shows component state
3. **Console logging** - Check browser console for errors
4. **Stop server** - Ctrl+C in terminal
