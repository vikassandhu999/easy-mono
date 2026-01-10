import {Avatar, Chip} from '@heroui/react';

import {Client} from '@/services/clients';

const getInitials = (name: string) => {
  const names = name.split(' ');
  const initials = names.map((n) => n.charAt(0).toUpperCase());
  return initials.slice(0, 2).join('');
};

interface Props {
  client: Client;
  onClick?: (id: string) => void;
}

const ClientCard = ({client, onClick}: Props) => {
  return (
    <button
      className={
        'w-full flex gap-2 p-3 shadow rounded-2xl border border-gray-200 cursor-pointer bg-surface hover:shadow-md hover:bg-surface-hover'
      }
      onClick={() => onClick?.(client.id)}
    >
      <Avatar color={'accent'}>
        <Avatar.Fallback>{getInitials(client.full_name)}</Avatar.Fallback>
      </Avatar>
      <div className={'flex flex-col items-start justify-center flex-1'}>
        <div className={'flex flex-1 w-full justify-between items-center'}>
          <h3 className={'text-base font-semibold'}>{client.full_name}</h3>
          <Chip
            className={'capitalize'}
            color={'accent'}
            size={'md'}
            variant={'soft'}
          >
            {client.status}
          </Chip>
        </div>
        <p className={'text-sm text-gray-600'}>{client.email}</p>
      </div>
    </button>
  );
};

export default ClientCard;
