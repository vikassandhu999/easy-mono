import {Button, Collapse, Image, SimpleGrid, Text, UnstyledButton} from '@mantine/core';
import {IconCheck, IconChevronDown, IconChevronUp} from '@tabler/icons-react';
import {FC, useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {CreateRecipeForm, RECIPE_IMAGE_OPTIONS} from '@/services/recipes';

import classes from './styles.module.css';

type ImagePickerProps = {
  form: UseFormReturn<CreateRecipeForm, any, CreateRecipeForm>;
};

const ImagePicker: FC<ImagePickerProps> = ({form}) => {
  const {control} = form;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={classes.section}>
      <div className={classes.sectionHeader}>
        <span className={classes.sectionTitle}>Recipe Image</span>
        <Button
          color="gray"
          onClick={() => setIsOpen(!isOpen)}
          rightSection={isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          size="compact-xs"
          variant="subtle"
        >
          {isOpen ? 'Hide' : 'Select'}
        </Button>
      </div>
      <Collapse in={isOpen}>
        <Controller
          control={control}
          name="image_url"
          render={({field}) => (
            <SimpleGrid
              cols={{base: 3, sm: 5}}
              spacing="sm"
            >
              {RECIPE_IMAGE_OPTIONS.map((option) => {
                const isSelected = field.value === option.url;
                return (
                  <UnstyledButton
                    className={`${classes.imageOption} ${isSelected ? classes.imageOptionSelected : ''}`}
                    key={option.id}
                    onClick={() => field.onChange(option.url)}
                  >
                    <Image
                      alt={option.label}
                      fit="cover"
                      h={80}
                      radius="md"
                      src={option.url}
                    />
                    {isSelected && (
                      <div className={classes.imageCheckmark}>
                        <IconCheck size={16} />
                      </div>
                    )}
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
          )}
        />
        <Text
          c="dimmed"
          size="xs"
        >
          Select an image for your recipe
        </Text>
      </Collapse>
    </div>
  );
};

export default ImagePicker;
