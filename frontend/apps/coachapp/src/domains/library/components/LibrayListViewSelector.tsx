import {
    ActionIcon,
    Button,
    Card,
    Chip,
    CloseButton,
    Collapse,
    Group,
    SegmentedControl,
    Stack,
    TextInput,
    Title,
} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconFilter2, IconPoint, IconSearch} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

import useScreenSize from '@/hooks/useScreenSize';

import {CONTENT_DISCIPLINE} from '../config';

export type ContentState = {
    discipline: string;
    type: string;
    search: string;
};

type LibraryListViewSelectorProps = {
    content: ContentState;
    setContent: (content: ContentState) => void;
};

const LibraryListViewSelector = ({content, setContent}: LibraryListViewSelectorProps) => {
    const {isDesktop, isTab, isMobile} = useScreenSize();
    const [searchInput, setSearchInput] = useState(content.search);
    const [debouncedSearch] = useDebouncedValue(searchInput, 300);
    const [filterOpen, setFilterOpen] = useState<boolean>(false);

    useEffect(() => {
        if (debouncedSearch !== content.search) {
            setContent({
                ...content,
                search: debouncedSearch,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    // Sync search input when content.search changes externally
    useEffect(() => {
        if (content.search !== searchInput) {
            setSearchInput(content.search);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content.search]);

    const handleDisciplineChange = (value: string) => {
        const disciplineConfig = CONTENT_DISCIPLINE.find((ob) => ob.value === value) ?? CONTENT_DISCIPLINE[0];
        const defaultType = disciplineConfig.options[0]?.value ?? '';

        setContent({
            discipline: value,
            type: defaultType,
            search: content.search,
        });
    };

    const handleTypeChange = (value: null | string) => {
        if (!value) return;

        setContent({
            ...content,
            type: value,
        });
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.currentTarget.value);
    };

    const activeDiscipline = CONTENT_DISCIPLINE.find((ob) => ob.value === content.discipline) ?? CONTENT_DISCIPLINE[0];

    return (
        <Stack
            py="sm"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 99,
                background: 'white',
            }}
        >
            <SegmentedControl
                data={CONTENT_DISCIPLINE}
                fullWidth
                onChange={handleDisciplineChange}
                radius="xl"
                size="md"
                value={content.discipline}
            />

            <Chip.Group
                onChange={handleTypeChange}
                value={content.type}
            >
                <Group
                    justify={!isMobile ? 'center' : 'left'}
                    wrap={!isMobile ? 'nowrap' : 'wrap-reverse'}
                >
                    {activeDiscipline.options.map(({id, label, value, color}) => {
                        return (
                            <Chip
                                color={color}
                                icon={<IconPoint />}
                                key={id}
                                size="lg"
                                value={value}
                                variant="light"
                            >
                                {label}
                            </Chip>
                        );
                    })}

                    <TextInput
                        flex={isDesktop || isTab ? 'auto' : 1}
                        leftSection={<IconSearch size={16} />}
                        onChange={handleSearchChange}
                        placeholder="Search here.."
                        radius="xl"
                        rightSection={
                            searchInput && (
                                <CloseButton
                                    aria-label="Clear search"
                                    onClick={() => setSearchInput('')}
                                    size="sm"
                                />
                            )
                        }
                        size="sm"
                        value={searchInput}
                    />
                </Group>
            </Chip.Group>
        </Stack>
    );
};

export default LibraryListViewSelector;
