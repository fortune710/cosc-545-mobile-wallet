## Rules for Coding Agents

### Coding Standards
1. DO NOT fetch data with `useEffect`, use `useQuery` from @tanstack/react-query instead. When you need to update data, use `useMutation` from @tanstack/react-query as well, and make sure you invalidate queries as well in onSuccess handlers.

2. Query Keys for useQuery and useMutation should be gotten from and created in `src/lib/query-keys.ts`.

3. For every operation you make to the backend server, add structured logging using `lib/logger.ts` and use the `loging-best-practices` agent skill to know what to log.

4. Functions and custom hooks you create MUST have docstrings.

5. Whenever you create or edit UI, use the `vercel-react-best-practices` and the `web-design-guidelines` agent skills to ensure that the UI and UX follow best practices for perfect Lighthouse scores.

### Domain Knowledge
1. This project is a mobile wallet application that allows users to send and recieve micro-payments. All amounts are in USD and should be capped at $50.
