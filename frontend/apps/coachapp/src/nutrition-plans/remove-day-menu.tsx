import {useState} from 'react';
import type {NutritionMenu} from '../api/nutrition-plans';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {weekdays} from './menu';

export function RemoveDayMenu({
  menu,
  patternId,
  onRemove,
  onClose,
}: {
  menu: NutritionMenu;
  patternId: string;
  onRemove: (replacementId: string) => void;
  onClose: () => void;
}) {
  const pattern = menu.day_patterns.find((day) => day.id === patternId);
  const options = menu.day_patterns.filter((day) => day.id !== patternId);
  const [replacement, setReplacement] = useState(options[0]?.id ?? '');
  const days = weekdays.filter((day) => menu.schedule[day] === patternId);
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Remove day menu?</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>
          <strong>{pattern?.name}</strong> and meals used only by this menu will be removed from the draft. Other menus
          stay unchanged.
        </p>
        {days.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose the menu for: <span className="capitalize">{days.join(', ')}</span>.
            </p>
            <div className="grid gap-2">
              <label
                id="replacement-menu-label"
                htmlFor="replacement-menu"
                className="text-sm font-medium"
              >
                Replacement menu
              </label>
              <SelectField
                id="replacement-menu"
                value={replacement}
                onChange={setReplacement}
              >
                {options.map((day) => (
                  <SelectItem
                    key={day.id}
                    id={day.id}
                  >
                    {day.name}
                  </SelectItem>
                ))}
              </SelectField>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onPress={onClose}
          >
            Keep menu
          </Button>
          <Button
            variant="destructive"
            isDisabled={!replacement}
            onPress={() => onRemove(replacement)}
          >
            Remove menu
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
