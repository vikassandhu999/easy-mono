import {Stack, Group, Text, Title, Card} from '@mantine/core';
import {Program} from '@/Api/Programs';

type Props = {
    program: Program;
    stats?: {
        activeClients: number;
        totalRevenue: number;
    };
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
                    fontSize: 'var(--title1-font-size)',
                    lineHeight: 'var(--title1-line-height)',
                    fontWeight: 400,
                }}
            >
                {text}
            </Text>
        </Stack>
    );
}

export default function HeroSection({program, stats, titleRef}: Props) {
    return (
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
            <Stack gap={0}>
                <Title
                    order={5}
                    ref={titleRef}
                    style={{
                        wordBreak: 'break-word',
                        color: 'var(--mantine-color-text-primary)',
                        marginBottom: 'var(--ce-size-xs)',
                        flex: 1,
                    }}
                >
                    {program.name}
                </Title>

                {program.description && (
                    <Text
                        c="dimmed"
                        lineClamp={4}
                        style={{
                            wordBreak: 'break-word',
                            fontSize: 'var(--callout-font-size)',
                            lineHeight: 'var(--callout-line-height)',
                            marginBottom: 'var(--callout-offset)',
                        }}
                    >
                        {program.description}
                    </Text>
                )}

                {/* <Divider /> */}

                {stats && (
                    <Group style={{marginTop: 'var(--title1-offset)', gap: 'var(--title1-font-size)'}}>
                        <DisplayStat
                            label={'clients'}
                            text={stats.activeClients}
                        />
                        {/* <Divider orientation={'vertical'} /> */}
                        <DisplayStat
                            label={'Revenue'}
                            text={`$${stats.totalRevenue.toLocaleString()}`}
                        />
                    </Group>
                )}
            </Stack>
        </Card>
    );
}
