import {Button, Input, Label} from '@heroui/react';
import {X} from 'lucide-react';
import {KeyboardEvent, useState} from 'react';

type TagsInputProps = {
  label: string;
  onChange: (tags: string[]) => void;
  placeholder?: string;
  value: string[];
};

const normalizeTag = (tag: string) => tag.trim();

export default function TagsInput({label, onChange, placeholder = 'Add tags', value}: TagsInputProps) {
  const [draft, setDraft] = useState('');

  const appendTags = (rawValue: string) => {
    const parts = rawValue.split(',').map(normalizeTag).filter(Boolean);

    if (parts.length === 0) {
      return;
    }

    const unique = new Set(value);
    parts.forEach((part) => {
      unique.add(part);
    });
    onChange(Array.from(unique));
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    event.preventDefault();
    appendTags(draft);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-separator bg-surface-secondary px-2 py-1 text-xs text-foreground"
              key={tag}
            >
              <span>{tag}</span>
              <button
                aria-label={`Remove ${tag}`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                onClick={() => removeTag(tag)}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        className="min-h-11"
        onBlur={() => appendTags(draft)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        value={draft}
        variant="secondary"
      />
      {value.length > 0 ? (
        <div>
          <Button
            className="min-h-11"
            onPress={() => onChange([])}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear tags
          </Button>
        </div>
      ) : null}
    </div>
  );
}
