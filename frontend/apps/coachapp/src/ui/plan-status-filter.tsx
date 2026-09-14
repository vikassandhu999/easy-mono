import {useSearchParams} from 'react-router-dom';
import {SelectItem} from './select';
import {SelectField} from './select-field';

export function usePlanStatus() {
  const [params] = useSearchParams();
  const status = params.get('status');
  return status === 'all' ? null : status === 'archived';
}
export function PlanStatusFilter() {
  const [params, setParams] = useSearchParams();
  const archived = usePlanStatus();
  return (
    <div className="grid gap-2">
      <label
        id="plan-status-label"
        htmlFor="plan-status"
        className="text-sm font-medium"
      >
        Status
      </label>
      <SelectField
        id="plan-status"
        value={archived === null ? 'all' : archived ? 'archived' : 'active'}
        onChange={(value) => {
          const next = new URLSearchParams(params);
          next.set('status', value);
          setParams(next);
        }}
      >
        <SelectItem id="active">Active</SelectItem>
        <SelectItem id="archived">Archived</SelectItem>
        <SelectItem id="all">All statuses</SelectItem>
      </SelectField>
    </div>
  );
}
