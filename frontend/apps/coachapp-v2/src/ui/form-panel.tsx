import {Surface} from '@heroui/react';
import type {ReactNode} from 'react';

type FormPanelProps = {
  children: ReactNode;
};

/**
 * The canonical body surface for create and edit forms.
 *
 * Phone layouts keep the fields directly on the page. Wider layouts group the
 * same content into the app's bordered card surface.
 */
export function FormPanel({children}: FormPanelProps) {
  return (
    <Surface className="bg-transparent sm:rounded-card sm:border sm:border-border sm:bg-surface sm:p-6">
      {children}
    </Surface>
  );
}
