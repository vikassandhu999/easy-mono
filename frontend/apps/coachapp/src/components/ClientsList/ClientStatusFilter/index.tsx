import {Tabs} from '@heroui/react';

import {Client} from '@/services/clients';

const STATUS_DATA: {label: string; value: string}[] = [
  {label: 'All', value: 'all'},
  {label: 'Active', value: 'active'},
  {label: 'Pending', value: 'pending'},
  {label: 'Inactive', value: 'inactive'},
];

type Props = {
  status?: Client['status'];
  onStatusChange: (status: Client['status']) => void;
  className?: string;
};

const ClientStatusFilter = ({status, onStatusChange, className}: Props) => {
  return (
    <Tabs
      className={className}
      onSelectionChange={(selection) => onStatusChange(selection?.toString() as Client['status'])}
      selectedKey={status}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Options">
          {STATUS_DATA.map((statusItem) => (
            <Tabs.Tab
              id={statusItem.value}
              key={statusItem.value}
            >
              {statusItem.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
};

export default ClientStatusFilter;
