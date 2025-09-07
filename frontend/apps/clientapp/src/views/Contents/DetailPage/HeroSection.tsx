import {Stack, Group, Text, Title, Card, Badge} from '@mantine/core';
import {Content} from '@/Api/Contents';
import DOMPurify from 'dompurify';
import MediaDisplay from './MediaDisplay';

type Props = {
    content: Content;
    titleRef: (instance: HTMLHeadingElement) => void;
};

function DisplayStat({label, text}: {label: string; text: number | string}) {
    return (
        <Stack
            gap={0}
            align="start"
            justify="start"
        >
            <Text
                c="dark.4"
                style={{
                    fontSize: 'var(--label-font-size)',
                    lineHeight: 'var(--label-line-height)',
                    marginBottom: 'var(--label-offset)',
                    fontWeight: 400,
                }}
            >
                {label}
            </Text>
            <Text
                style={{
                    fontSize: 'var(--callout-font-size)',
                    lineHeight: 'var(--callout-line-height)',
                    fontWeight: 400,
                    textTransform: 'capitalize',
                }}
            >
                {text}
            </Text>
        </Stack>
    );
}

export default function HeroSection({content, titleRef}: Props) {
    const sanitizedContent = DOMPurify.sanitize(content.instructions);

    return (
        <Stack gap={'lg'}>
            {/* Media Section */}
            <MediaDisplay
                media={content.media}
                fallbackThumbnail={content.thumbnail_url}
                height={200}
            />
            <Card
                style={{
                    paddingLeft: 'var(--title3-font-size)',
                    paddingRight: 'var(--title3-font-size)',
                    paddingBottom: 'var(--title3-font-size)',
                    paddingTop: 'var(--title3-offset)',
                    borderRadius: 'var(--title3-offset)',
                    boxShadow: 'var(--shadow-sm)',
                }}
                withBorder
            >
                <Stack gap="lg">
                    <Stack gap={0}>
                        <Group
                            justify="space-between"
                            align="flex-start"
                            wrap="nowrap"
                            gap="sm"
                            style={{marginBottom: 'var(--ce-size-xs)'}}
                        >
                            <Title
                                order={5}
                                ref={titleRef}
                                style={{
                                    wordBreak: 'break-word',
                                    color: 'var(--mantine-color-text-primary)',
                                    flex: 1,
                                }}
                            >
                                {content.name}
                            </Title>

                            <Badge
                                color={content.is_published ? 'green.6' : 'gray.5'}
                                variant="light"
                                size={'md'}
                                tt={'capitalize'}
                            >
                                {content.is_published ? 'Published' : 'Draft'}
                            </Badge>
                        </Group>

                        {content.instructions && (
                            <Text
                                c="dimmed"
                                style={{
                                    wordBreak: 'break-word',
                                    fontSize: 'var(--callout-font-size)',
                                    lineHeight: 'var(--callout-line-height)',
                                    marginBottom: 'var(--callout-offset)',
                                    whiteSpace: 'pre-wrap',
                                }}
                                dangerouslySetInnerHTML={{__html: sanitizedContent}}
                            />
                        )}

                        {/* Content Stats */}
                        <Group style={{marginTop: 'var(--title1-offset)', gap: 'var(--title1-font-size)'}}>
                            <DisplayStat
                                label={'Type'}
                                text={content.type}
                            />
                            {content.tags && content.tags.length > 0 && (
                                <DisplayStat
                                    label={'Tags'}
                                    text={content.tags.length}
                                />
                            )}
                        </Group>
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    );
}
