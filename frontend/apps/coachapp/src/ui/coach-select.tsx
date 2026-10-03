import {useEffect, useState} from 'react';
import {type TeamMember, useTeam} from '../api/team';
import {Button} from './button';
import {Dialog, DialogHeader, DialogTitle} from './dialog';
import {InfiniteList} from './infinite-list';
import {Input} from './input';
import {Label} from './label';

export function CoachSelect({isDisabled, onChange}: {isDisabled: boolean; onChange: (coach: TeamMember) => void}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Assigned coach</p>
      <Button
        variant="outline"
        isDisabled={isDisabled}
        onPress={() => setOpen(true)}
      >
        {selected ? selected.preferred_name || selected.full_name : 'You · Change coach'}
      </Button>
      {open && (
        <CoachChoices
          onClose={() => setOpen(false)}
          onSelect={(coach) => {
            setSelected(coach);
            onChange(coach);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
function CoachChoices({onClose, onSelect}: {onClose: () => void; onSelect: (coach: TeamMember) => void}) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timeout = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  const query = useTeam({state: 'active', q});
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Choose a coach</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="invite-coach-search">Search coaches</Label>
          <Input
            id="invite-coach-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <InfiniteList
          query={query}
          label="coaches"
          singular="coach"
          empty={<p>No matching coaches.</p>}
        >
          {(coach) => (
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="min-w-0 break-words">{coach.preferred_name || coach.full_name}</p>
              <Button
                variant="outline"
                onPress={() => onSelect(coach)}
              >
                Choose
              </Button>
            </div>
          )}
        </InfiniteList>
      </div>
    </Dialog>
  );
}
