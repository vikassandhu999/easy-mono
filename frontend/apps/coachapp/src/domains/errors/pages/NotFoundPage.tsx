import {Button, Container, Group, Text, Title} from '@mantine/core';
import {useNavigate} from 'react-router';

import NotFoundIllustration from '../components/NotFoundIllustation';
import classes from './NotFound.module.css';

export function NotFoundPage() {
    const navigate = useNavigate();

    const redirectBack = () => {
        navigate(-1);
    };

    return (
        <Container className={classes.root}>
            <div className={classes.inner}>
                <NotFoundIllustration className={classes.image} />
                <div className={classes.content}>
                    <Title className={classes.title}>Nothing to see here</Title>
                    <Text
                        c="dimmed"
                        className={classes.description}
                        size="lg"
                        ta="center"
                    >
                        Page you are trying to open does not exist. You may have mistyped the address, or the page has
                        been moved to another URL. If you think this is an error contact support.
                    </Text>
                    <Group justify="center">
                        <Button
                            onClick={redirectBack}
                            size="md"
                        >
                            Take me back
                        </Button>
                    </Group>
                </div>
            </div>
        </Container>
    );
}
