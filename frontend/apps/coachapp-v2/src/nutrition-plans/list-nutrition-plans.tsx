import {Button, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useGoBack} from '@/@hooks/use-go-back';

import {NutritionPlansBrowseList} from './nutrition-plans-list';

export default function ListNutritionPlans() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  return (
    <Page>
      <Page.Header className="pt-4 pb-2">
        <Page.TitleGroup>
          <Page.Title>Nutrition Plans</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_NUTRITION_PLAN)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={
          'sticky top-0 z-10 flex flex-col gap-3 bg-background pt-2 pb-3 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-divider after:opacity-0 after:transition-opacity group-data-[scrolled=true]/page:after:opacity-100'
        }
      >
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Library
        </Button>
        <SearchField
          aria-label="Search nutrition plans"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search nutrition plans..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Page.Toolbar>
      <Page.Content>
        <NutritionPlansBrowseList
          hasFilter={!!debouncedSearch}
          search={debouncedSearch}
        />
      </Page.Content>
    </Page>
  );
}
