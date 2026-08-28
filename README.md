# Candidate Intelligence

An AI-powered multi-agent candidate evaluation system for recruiters and interviewers.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and populate the variables.
3. Start the development server: `npm run dev`

## Architecture

This project follows a strict separation of concerns to maintain a clean codebase:

- **UI & Components**: `src/components/`, `src/app/`
- **AI Agents**: `src/agents/` (Independent logic, no tight coupling)
- **Agent Prompts**: `src/prompts/`
- **Orchestration**: `src/services/orchestration/` (Coordinating agents)
- **Document Processing**: `src/services/document/`
- **Candidate Profile Builder**: `src/services/profile/`
- **Debate & Opinion Tracking**: `src/services/debate/`
- **Final Judge & Decision**: `src/services/decision/`
- **Validation**: `src/validation/` (Zod schemas)
- **Database/Auth**: `src/lib/supabase/`
- **Utilities**: `src/lib/constants/`, `src/lib/utils/`, `src/lib/errors/`, `src/lib/logger/`
- **API Routes**: `src/app/api/` (Server-side boundaries)
- **Testing**: `tests/unit/`, `tests/integration/`, `tests/fixtures/`

Client-side code should never directly access AI APIs or sensitive database operations. All keys remain server-side.
