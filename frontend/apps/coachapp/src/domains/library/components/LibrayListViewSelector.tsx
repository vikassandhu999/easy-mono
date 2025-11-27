import {useDebouncedValue} from '@mantine/hooks';
import {IconSearch, IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

import {CONTENT_DISCIPLINE} from '../config';
import classes from './styles.module.css';

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
    const [searchInput, setSearchInput] = useState(content.search);
    const [debouncedSearch] = useDebouncedValue(searchInput, 300);

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

    const handleTypeChange = (value: string) => {
        if (!value) return;

        setContent({
            ...content,
            type: value,
        });
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.currentTarget.value);
    };

    const handleClearSearch = () => {
        setSearchInput('');
    };

    const activeDiscipline = CONTENT_DISCIPLINE.find((ob) => ob.value === content.discipline) ?? CONTENT_DISCIPLINE[0];

    // Map color names to CSS class names
    const getColorClass = (color: string, isActive: boolean) => {
        if (!isActive) return '';
        const colorMap: Record<string, string> = {
            blue: classes.typeChipBlue,
            green: classes.typeChipGreen,
            cyan: classes.typeChipCyan,
            orange: classes.typeChipOrange,
        };
        return colorMap[color] || '';
    };

    return (
        <div className={classes.container}>
            {/* Discipline Tabs */}
            <div className={classes.disciplineTabs}>
                {CONTENT_DISCIPLINE.map((discipline) => (
                    <button
                        className={`${classes.disciplineTab} ${
                            content.discipline === discipline.value ? classes.disciplineTabActive : ''
                        }`}
                        key={discipline.id}
                        onClick={() => handleDisciplineChange(discipline.value)}
                        type="button"
                    >
                        {discipline.label}
                    </button>
                ))}
            </div>

            {/* Filters Row: Type Chips + Search */}
            <div className={classes.filtersRow}>
                {/* Type Chips */}
                <div className={classes.typeChips}>
                    {activeDiscipline.options.map(({id, label, value, color}) => {
                        const isActive = content.type === value;
                        return (
                            <button
                                className={`${classes.typeChip} ${isActive ? classes.typeChipActive : ''} ${getColorClass(color, isActive)}`}
                                key={id}
                                onClick={() => handleTypeChange(value)}
                                type="button"
                            >
                                <span className={classes.chipDot} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Search Input */}
                <div className={classes.searchWrapper}>
                    <IconSearch
                        className={classes.searchIcon}
                        size={16}
                    />
                    <input
                        className={classes.searchInput}
                        onChange={handleSearchChange}
                        placeholder="Search..."
                        type="text"
                        value={searchInput}
                    />
                    {searchInput && (
                        <button
                            aria-label="Clear search"
                            className={classes.clearButton}
                            onClick={handleClearSearch}
                            type="button"
                        >
                            <IconX size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LibraryListViewSelector;
