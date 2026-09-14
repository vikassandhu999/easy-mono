import {useState} from 'react';
import type {Food} from '../api/foods';
import {MediaPreview} from './media-preview';

export function FoodMediaPreview({food}: {food: Pick<Food, 'name' | 'media'>}) {
  const [open, setOpen] = useState(false);
  if (!food.media) {
    return null;
  }
  return (
    <details
      className="mt-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="w-fit cursor-pointer py-2 text-sm font-medium">
        View {food.media.kind === 'image' ? 'photo' : 'video'}
      </summary>
      {open && (
        <div className="mt-2">
          <MediaPreview
            key={food.media.id}
            url={food.media.url}
            kind={food.media.kind}
            label={`${food.name} photo or video`}
          />
        </div>
      )}
    </details>
  );
}
