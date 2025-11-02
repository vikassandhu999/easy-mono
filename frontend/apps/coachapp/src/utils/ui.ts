import {MembershipStatus} from '@/services/clients';

/**
 * Assigns a color from a predefined list based on the hash of a token.
 * This ensures that the same token always gets the same color.
 * @param token The input string token (e.g., a client ID).
 * @returns A color string.
 */
export function assignColorByToken(token: string): string {
    const colors = [
        'blue',
        'cyan',
        'grape',
        'green',
        'indigo',
        'lime',
        'orange',
        'pink',
        'red',
        'teal',
        'violet',
        'yellow',
    ];

    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        hash = token.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

/**
 * Generates initials from a full name.
 * @param name The full name string.
 * @returns The initials (e.g., "JD" for "John Doe").
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Gets the color associated with a membership status.
 * @param status The membership status.
 * @returns A color string for UI elements.
 */
export function getMembershipStatusColor(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'green';
        case MembershipStatus.CANCELLED:
            return 'red';
        case MembershipStatus.INACTIVE:
            return 'gray';
        case MembershipStatus.PAUSED:
            return 'yellow';
        default:
            return 'gray';
    }
}

/**
 * Gets the display label for a membership status.
 * @param status The membership status.
 * @returns A human-readable label for the status.
 */
export function getMembershipStatusLabel(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'Active';
        case MembershipStatus.CANCELLED:
            return 'Cancelled';
        case MembershipStatus.INACTIVE:
            return 'Inactive';
        case MembershipStatus.PAUSED:
            return 'Paused';
        default:
            return 'Unknown';
    }
}
