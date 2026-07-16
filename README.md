# Reels

A modern, responsive web application for watching premium 18+ video content. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Endless Scroll**: Fresh reels from multiple public feeds, shuffled just for you
- **Save & Like**: Double-tap to like, save your favorites for later
- **Coin System**: Earn coins while watching reels (2 coins per reel watched)
- **Auto-Scroll**: Continuous viewing with optional auto-scroll toggle
- **PIN Protection**: Secure PIN authentication for privacy
- **Dark/Light Theme**: Beautiful theme support
- **PWA Ready**: Progressive Web App for mobile experience
- **Privacy First**: All data stored locally on your device

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **TanStack Router** - Routing
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Cloudflare Pages** - Hosting

## Getting Started

### Prerequisites

- Node.js 18+ 
- Bun or npm

### Installation

```bash
# Install dependencies
bun install
# or
npm install
```

### Development

```bash
# Start development server
bun run dev
# or
npm run dev
```

### Build

```bash
# Build for production
bun run build
# or
npm run build
```

### Preview

```bash
# Preview production build
bun run preview
# or
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and storage
├── routes/          # Page routes
└── styles/          # Global styles
```

## Authentication

The app uses a PIN-based authentication system:
- Universal PIN: `000111` (for all users)
- Personal PIN: Generated from date of birth (DDMMYY format)

## Privacy & Security

- All user data is stored locally on the device
- No personal data is collected or stored on servers
- PIN verification persists for the current browser session only
- PIN is required every time the app is opened (new session)

## Credits

Designed and developed by **Satyam RojhaX**

## Deployment

### Cloudflare Pages

This project is configured for Cloudflare Pages deployment:

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set Node.js version: `18`
5. Deploy!

The project includes:
- `wrangler.toml` for Cloudflare Pages configuration
- `_redirects` file for SPA routing
- `manifest.json` for PWA support

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy the dist folder to your hosting service
```

## License

This project is private and proprietary.

## Contact

For questions or support, contact: epowerxlabs@gmail.com
