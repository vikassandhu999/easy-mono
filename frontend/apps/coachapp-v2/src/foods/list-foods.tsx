import {Button, SearchField} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useGoBack} from '@/@hooks/use-go-back';

import FoodsList from './components/foods-list';

export default function ListFoods() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedValue(search);

  return (
    <Page>
      <Page.Header className="pt-4 pb-2">
        <Page.TitleGroup>
          <Page.Title>Foods</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_FOOD)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Toolbar
        className={
          'sticky top-0 z-10 flex shrink-0 flex-col gap-3 bg-background pt-2 pb-3 backdrop-blur after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-divider after:opacity-0 after:shadow-sm after:transition-opacity group-data-[scrolled=true]/page:after:opacity-100 supports-[backdrop-filter]:bg-background/80'
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
          aria-label="Search foods"
          className="w-full sm:max-w-xs"
          onChange={setSearch}
          value={search}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search foods..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Page.Toolbar>
      <Page.Content>
        <FoodsList
          hasFilter={!!debouncedSearch}
          search={debouncedSearch}
        />
      </Page.Content>
    </Page>
  );
}
