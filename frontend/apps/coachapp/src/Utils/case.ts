export function toTitleCase(str: string | number) {
    return (str || '')
        .toString()
        .replace('_', ' ')
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
