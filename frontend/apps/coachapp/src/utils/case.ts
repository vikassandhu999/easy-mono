export function toTitleCase(str: number | string) {
    return (str || '')
        .toString()
        .replace('_', ' ')
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
