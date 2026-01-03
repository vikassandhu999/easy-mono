import {Avatar, Badge} from '@mantine/core';

import {Client} from '@/services/clients';

import classes from './ClientCard.module.css';

interface Props {
    client: Client;
    onClick?: (id: string) => void;
}

const ClientCard = ({client, onClick}: Props) => {
    return (
        <button
            className={classes.root}
            onClick={() => onClick?.(client.id)}
        >
            <Avatar
                color="initials"
                name={client.full_name}
                radius="xl"
                size="md"
            />
            <div className={classes.content}>
                <div className={classes.contentTop}>
                    <p className={classes.title}>{client.full_name}</p>
                    <Badge
                        color="var(--ce-fill-warning-weak)"
                        size={'md'}
                        style={{
                            color: 'var(--ce-text-warning)',
                            border: '1px solid var(--ce-stroke-warning-weak)',
                            textDecoration: 'none',
                        }}
                    >
                        {client.status}
                    </Badge>
                </div>
                <p className={classes.description}>{client.email}</p>
            </div>
        </button>
    );
};

export default ClientCard;
