/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns The string with each word capitalized
 */
export function capitalizeWords(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str
        .split(' ')
        .map((word) => capitalize(word))
        .join(' ');
}

/**
 * Converts a string to title case
 * @param str - The string to convert
 * @returns The title-cased string
 */
export function titleCase(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }

    const smallWords = [
        'a',
        'an',
        'and',
        'as',
        'at',
        'but',
        'by',
        'for',
        'if',
        'in',
        'of',
        'on',
        'or',
        'the',
        'to',
        'via',
    ];

    return str
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            // Always capitalize first and last word
            if (index === 0 || index === str.split(' ').length - 1) {
                return capitalize(word);
            }
            // Don't capitalize small words
            if (smallWords.includes(word)) {
                return word;
            }
            return capitalize(word);
        })
        .join(' ');
}

/**
 * Converts a snake_case string to Title Case
 * @param str - The snake_case string
 * @returns The Title Case string
 */
export function snakeToTitle(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str
        .split('_')
        .map((word) => capitalize(word))
        .join(' ');
}

/**
 * Converts a camelCase string to Title Case
 * @param str - The camelCase string
 * @returns The Title Case string
 */
export function camelToTitle(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map((word) => capitalize(word))
        .join(' ');
}

/**
 * Truncates a string to a specified length and adds ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the string
 * @param ellipsis - The ellipsis string (default: '...')
 * @returns The truncated string
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
    if (!str || str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Converts a string to kebab-case
 * @param str - The string to convert
 * @returns The kebab-case string
 */
export function toKebabCase(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

/**
 * Converts a string to snake_case
 * @param str - The string to convert
 * @returns The snake_case string
 */
export function toSnakeCase(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
}

/**
 * Converts a string to camelCase
 * @param str - The string to convert
 * @returns The camelCase string
 */
export function toCamelCase(str: string): string {
    if (!str || str.length === 0) {
        return str;
    }
    return str.toLowerCase().replace(/[_-\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
}

/**
 * Pluralizes a word based on count
 * @param word - The word to pluralize
 * @param count - The count to check
 * @param pluralForm - Optional custom plural form
 * @returns The word in singular or plural form
 */
export function pluralize(word: string, count: number, pluralForm?: string): string {
    if (count === 1) {
        return word;
    }
    return pluralForm || `${word}s`;
}

/**
 * Removes extra whitespace from a string
 * @param str - The string to clean
 * @returns The cleaned string
 */
export function cleanWhitespace(str: string): string {
    if (!str) {
        return str;
    }
    return str.replace(/\s+/g, ' ').trim();
}
