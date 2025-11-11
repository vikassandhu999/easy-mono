import {Stack, Text} from '@mantine/core';
import {FC} from 'react';
import {Link} from 'react-router';

import {LegalLink} from '../ui_config';

const ProfileLegalLinks: FC<{links: LegalLink[]}> = ({links}) => {
    return (
        <Stack>
            {links.map(({id, label, link}) => {
                return (
                    <Text
                        c="dimmed"
                        component={Link}
                        fw="500"
                        key={id}
                        size="xs"
                        to={link}
                        tt="uppercase"
                    >
                        {label}
                    </Text>
                );
            })}
        </Stack>
    );
};

export default ProfileLegalLinks;
