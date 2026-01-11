import {ReactNode} from 'react';

export default function EmptyState({search, status}: {search?: string; status?: any}) {
  let title = 'No clients found';
  let description: ReactNode = 'Try adjusting your search or status filter to see more clients.';

  if (search) {
    title = 'No matches found';
    description = (
      <>
        We couldn&apos;t find any clients matching &quot;
        <span className="font-semibold">{search}</span>&quot;.
      </>
    );
  } else if (status) {
    description = "We couldn't find any clients with that status.";
  }

  return (
    <div className="flex justify-center my-6">
      <div className="flex flex-col gap-0">
        <h4 className="text-center text-lg font-semibold m-0">{title}</h4>
        <p className="text-sm leading-5 text-muted text-center m-0">{description}</p>
      </div>
    </div>
  );
}
