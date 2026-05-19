import type {Key, UseOverlayStateReturn} from '@heroui/react';

import type {Client} from '@/api/clients';

import ClientPickerDialog from './client-picker-dialog';

type Props = {
  heading: string;
  onSelect: (client: Client) => void;
  selectedKey?: Key | null;
  state: UseOverlayStateReturn;
};

export default function ClientSingleSelectPicker({heading, onSelect, selectedKey, state}: Props) {
  return (
    <ClientPickerDialog
      heading={heading}
      onSelectionChange={(keys, clients) => {
        if (keys === 'all') return;
        const id = Array.from(keys)[0];
        if (!id) return;
        const selected = clients.find((client) => client.id === String(id));
        if (selected) onSelect(selected);
      }}
      selectedKeys={selectedKey ? new Set([selectedKey]) : undefined}
      selectionMode="single"
      state={state}
    />
  );
}
