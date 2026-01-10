import {ActionIcon} from '@mantine/core';
import {IconArrowLeft} from '@tabler/icons-react';

export default function GoBackButton({onBack}: {onBack: () => void}) {
  return (
    <ActionIcon
      color="dark"
      onClick={onBack}
      radius={'md'}
      size={'xl'}
      style={{cursor: 'pointer', flexShrink: 0}}
      variant={'subtle'}
    >
      <IconArrowLeft size={28} />
    </ActionIcon>
  );
}
