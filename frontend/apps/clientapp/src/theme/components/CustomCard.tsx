import {Card, Text, Button, Group} from '@mantine/core';
import './card.css'; // Import our custom card styles

interface CustomCardProps {
    title: string;
    subtitle?: string;
    body: string;
    meta?: string;
    actions?: React.ReactNode;
    variant?: 'outline' | 'filled' | 'light';
}

export function CustomCard({title, subtitle, body, meta, actions, variant = 'outline'}: CustomCardProps) {
    return (
        <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder={variant === 'outline'}
            data-variant={variant}
        >
            {/* Card Title - Following h4 hierarchy */}
            <Text
                data-card-title
                component="h3"
                mb="xs"
            >
                {title}
            </Text>

            {/* Card Subtitle - Secondary information */}
            {subtitle && (
                <Text
                    data-card-subtitle
                    mb="sm"
                >
                    {subtitle}
                </Text>
            )}

            {/* Card Body - Optimized for readability */}
            <Text
                data-card-body
                mb="md"
            >
                {body}
            </Text>

            {/* Card Meta - Small text for timestamps, etc. */}
            {meta && (
                <Text
                    data-card-meta
                    mb="md"
                >
                    {meta}
                </Text>
            )}

            {/* Card Actions */}
            {actions && <Group data-card-actions>{actions}</Group>}
        </Card>
    );
}

// Example usage component
export function CardExample() {
    return (
        <CustomCard
            title="Morning Yoga Workout"
            subtitle="With Brooklyn Sims • 5.0 (23 reviews)"
            body="Escape the stresses of everyday life with this balanced blend of mindful breathing techniques and physical postures. You'll feel refreshed and ready to take on the day."
            meta="20 mins • Beginner • Ambient • None"
            actions={
                <>
                    <Button variant="filled">Start workout</Button>
                    <Button variant="outline">Save for later</Button>
                </>
            }
            variant="outline"
        />
    );
}
