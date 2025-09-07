import React, { useState, useEffect } from 'react';
import { Box } from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';

import SpaceButton from "./SpaceButton";
import CoachSelectionModal from './CoachSelectionModal';
import { Coach, ClientCoachesAPI } from '@/api/ClientCoaches';

const SpaceSwitcher = () => {
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

    // Fetch coaches to set first one as default
    const { data: coaches } = useQuery({
        queryKey: ['client-coaches-default'],
        queryFn: async () => {
            const result = await ClientCoachesAPI.getCoaches();
            if (result.isError) {
                throw new Error(result.getError().message || 'Failed to load coaches');
            }
            return result.getValue();
        },
    });

    // Set first coach as default when coaches data loads
    useEffect(() => {
        if (coaches && coaches.length > 0 && !selectedCoach) {
            setSelectedCoach(coaches[0]);
        }
    }, [coaches, selectedCoach]);    const handleSwitchClick = () => {
        openModal();
    };

    const handleCoachSelect = (coach: Coach) => {
        setSelectedCoach(coach);
        // Here you can also update global state, localStorage, etc.
        // to persist the selected coach across the app
    };

    return (
        <Box>
            <SpaceButton 
                businessName={selectedCoach?.business_name} 
                businessAvatar={selectedCoach?.business_avatar} 
                coachName={selectedCoach?.name }
                onSwitchClick={handleSwitchClick}
            />
            
            <CoachSelectionModal
                opened={modalOpened}
                onClose={closeModal}
                currentCoachId={selectedCoach?.id}
                onCoachSelect={handleCoachSelect}
            />
        </Box>
    );
};

export default SpaceSwitcher;