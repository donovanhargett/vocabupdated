# VocabBuilder - AI-Powered Vocabulary Learning App

A full-stack vocabulary building app with spaced repetition, AI-generated definitions, and cross-device sync.

## Features

### 1. Home Tab
- Add new words with AI-generated definitions and colorful example sentences
- View all your saved words in a scrollable list
- Expand cards to see full definitions and examples
- Delete words with a single tap

### 2. Review Tab
- Spaced repetition flashcards using the SM-2 algorithm (same as Anki)
- Practice writing sentences with each word
- Get AI feedback on your usage with grades and suggestions
- Track your progress with review history

### 3. Reading Tab
- Manage your reading list in a spreadsheet-like interface
- Add books with author, title, and description
- Edit entries inline by clicking on any cell
- Responsive card view on mobile

### 4. Keys Tab
- Configure your OpenAI API key
- Test connection to verify your key works
- Securely store keys in your Supabase account

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database + Edge Functions)
- **AI**: OpenAI API (GPT-4o-mini)
- **Authentication**: Supabase Auth (email/password)
- **Real-time Sync**: Supabase real-time subscriptions

## Getting Started

### Prerequisites

1. A Supabase account with a project set up
2. An OpenAI API key (get one from [platform.openai.com](https://platform.openai.com/api-keys))

### Environment Setup

1. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

### Database Setup

The database schema has already been applied with the following tables:

- `vocab_words` - Stores vocabulary words with spaced repetition data
- `reading_list` - Manages your reading list
- `user_settings` - Stores API keys and preferences
- `review_history` - Tracks practice attempts and AI feedback

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

### First-Time Setup

1. Sign up for a new account or sign in
2. Go to the Keys tab and add your OpenAI API key
3. Test the connection to verify it works
4. Start adding words in the Home tab!

## How It Works

### Spaced Repetition (SM-2 Algorithm)

The review system uses the SuperMemo 2 (SM-2) algorithm to optimize learning:

- **Again (1)**: Resets the card to the beginning
- **Hard (2)**: Decreases the ease factor slightly
- **Good (3)**: Standard progression
- **Easy (4)**: Increases the ease factor and interval

Cards automatically schedule themselves based on your performance, ensuring you review words right before you're about to forget them.

### AI Integration

Two Edge Functions handle AI operations:

1. **generate-definition**: Creates definitions and example sentences for new words
2. **grade-sentence**: Evaluates your practice sentences and provides feedback

Your OpenAI API key is stored securely in Supabase and never exposed to the client.

### Cross-Device Sync

All data syncs in real-time across devices when you're signed in. Add a word on your phone, and it instantly appears on your computer.

## Dark Mode

The app defaults to dark mode but includes a theme toggle. Your preference is saved to your account and syncs across devices.

## Responsive Design

- **Mobile**: Bottom tab navigation, card-based layouts
- **Desktop**: Left sidebar navigation, table views
- **Breakpoint**: 768px

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Security

- All API keys are stored in Supabase user settings
- Row Level Security ensures data isolation between users
- Edge Functions validate authentication before processing requests
- No sensitive data is exposed to the client

## License

MIT
