import {createFileRoute} from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/page')({
  component: () => <span>My Page</span>,
});
