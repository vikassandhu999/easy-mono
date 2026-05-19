import type {Key, UseOverlayStateReturn} from '@heroui/react';

import {Button, Typography} from '@heroui/react';
import {useMemo, useState} from 'react';

import type {Client} from '@/api/clients';

import ClientPickerDialog from './client-picker-dialog';

type Props = {
  confirmLabel?: string;
  heading: string;
  onConfirm: (clients: Client[], keys: Set<Key>) => void;
  selectedKeys?: Iterable<Key>;
  state: UseOverlayStateReturn;
};

export default function ClientMultiSelectPicker({
  confirmLabel = 'Select clients',
  heading,
  onConfirm,
  selectedKeys,
  state,
}: Props) {
  const initialKeys = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const [keys, setKeys] = useState<Set<Key>>(initialKeys);

  return (
    <ClientPickerDialog
      footer={(clients) => (
        <ModalFooter
          count={keys.size}
          isDisabled={keys.size === 0}
          label={confirmLabel}
          onCancel={state.close}
          onConfirm={() => {
            onConfirm(
              clients.filter((client) => keys.has(client.id)),
              keys,
            );
            state.close();
          }}
        />
      )}
      heading={heading}
      onSelectionChange={(selection) => {
        if (selection === 'all') return;
        setKeys(new Set(selection));
      }}
      selectedKeys={keys}
      selectionMode="multiple"
      state={state}
    />
  );
}

type ModalFooterProps = {
  count: number;
  isDisabled: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function ModalFooter({count, isDisabled, label, onCancel, onConfirm}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-divider px-4 py-3">
      <Typography
        color="muted"
        type="body-sm"
      >
        {count} selected
      </Typography>
      <div className="flex items-center gap-2">
        <Button
          onPress={onCancel}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          isDisabled={isDisabled}
          onPress={onConfirm}
          size="sm"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
