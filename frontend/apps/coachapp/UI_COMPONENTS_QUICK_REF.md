# UI Components Quick Reference Guide

## 🎯 Quick Start

### Import All Components
```typescript
import {CETextInput, CETextArea, CEDatePickerInput, CEChipSelect} from '@/shared/ce_ui';
```

### Import Individual Components
```typescript
import CETextInput from '@/shared/ce_ui/CETextInput';
import CETextArea from '@/shared/ce_ui/CETextArea';
import CEDatePickerInput from '@/shared/ce_ui/CEDatePickerInput';
import {CEChipSelect} from '@/shared/ce_ui/CEChipSelect';
```

---

## 📍 Component Location

All UI components are now in: **`src/components/ce_ui/`**

```
ce_ui/
├── CETextInput/           → Text input with floating label
├── CETextArea/            → Textarea with floating label
├── CEDatePickerInput/     → Date picker with floating label
├── CEChipSelect/          → Multi/single select with chips
└── index.ts              → Barrel export (use this!)
```

---

## 🧩 Components

### CETextInput
**Enhanced text input with floating labels**

```typescript
<CETextInput
  label="Email"
  placeholder="your@email.com"
  description="We'll never share your email"
  error={errors.email?.message}
  withAsterisk
/>
```

**Props:**
- Extends `TextInputProps` from Mantine
- `description?: string | ReactNode` - Helper text below input
- All standard HTML input props supported

---

### CETextArea
**Enhanced textarea with floating labels**

```typescript
<CETextArea
  label="Bio"
  placeholder="Tell us about yourself..."
  description="Max 500 characters"
  rows={5}
/>
```

**Props:**
- Extends `TextareaProps` from Mantine
- `description?: string | ReactNode` - Helper text below textarea
- Support for auto-resize with `autosize`, `minRows`, `maxRows`

---

### CEDatePickerInput
**Date picker with floating labels**

```typescript
<CEDatePickerInput
  label="Birth Date"
  description="Must be 18 or older"
  placeholder="Select date..."
/>
```

**Props:**
- Extends `DatePickerInputProps` from Mantine
- `description?: string | ReactNode` - Helper text below picker
- Full date picker functionality from Mantine

---

### CEChipSelect
**Multi/single select using chips (formerly ChipSelect)**

```typescript
// Single select
<CEChipSelect
  label="Experience Level"
  data={['Beginner', 'Intermediate', 'Advanced']}
  multiple={false}
  value={level}
  onChange={setLevel}
/>

// Multiple select
<CEChipSelect
  label="Skills"
  data={skills}
  multiple={true}
  value={selectedSkills}
  onChange={setSelectedSkills}
/>

// With icons and descriptions
<CEChipSelect
  label="Plan Type"
  data={[
    {value: 'basic', label: 'Basic', icon: IconBasic},
    {value: 'pro', label: 'Pro', icon: IconPro},
    {value: 'enterprise', label: 'Enterprise', icon: IconEnterprise}
  ]}
  description="Choose your plan"
/>
```

**Props:**
- `data: ChipSelectOption[] | string[]` - Options to display
- `multiple?: boolean` - Allow multiple selections (default: false)
- `value?: string | string[]` - Current value(s)
- `onChange?: (value) => void` - Change callback
- `label?: ReactNode` - Label above chips
- `description?: ReactNode` - Helper text
- `disabled?: boolean` - Disable all chips
- `readOnly?: boolean` - Read-only mode
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Chip size
- `variant?: 'filled' | 'light' | 'outline'` - Chip style
- `radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Border radius

---

## 🎨 Styling Features

All components include:

✅ **Floating Labels** - Material Design-inspired
✅ **Dark Mode Support** - Automatic color adaptation
✅ **Icon Support** - `leftSection` and `rightSection` props
✅ **Error States** - Error messages with styling
✅ **Accessibility** - WCAG 2.1 AA compliant
✅ **Reduced Motion** - Respects user preferences
✅ **Responsive** - Works on all screen sizes

---

## 🔄 Usage with React Hook Form

```typescript
import {useForm, Controller} from 'react-hook-form';
import {CETextInput, CETextArea} from '@/shared/ce_ui';

function MyForm() {
  const {control, formState: {errors}} = useForm();

  return (
    <>
      <Controller
        control={control}
        name="email"
        rules={{required: 'Email is required'}}
        render={({field}) => (
          <CETextInput
            {...field}
            label="Email"
            error={errors.email?.message}
            withAsterisk
          />
        )}
      />

      <Controller
        control={control}
        name="bio"
        render={({field}) => (
          <CETextArea
            {...field}
            label="Bio"
            placeholder="Tell us about yourself..."
          />
        )}
      />
    </>
  );
}
```

---

## 📋 Common Patterns

### Form with All Components
```typescript
export function CompleteForm() {
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    birthDate: null,
    experience: ''
  });

  return (
    <form>
      <CETextInput
        label="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        withAsterisk
      />

      <CETextArea
        label="Bio"
        value={formData.bio}
        onChange={(e) => setFormData({...formData, bio: e.target.value})}
        description="Tell us about yourself"
      />

      <CEDatePickerInput
        label="Birth Date"
        value={formData.birthDate}
        onChange={(date) => setFormData({...formData, birthDate: date})}
      />

      <CEChipSelect
        label="Experience"
        data={['Beginner', 'Intermediate', 'Advanced']}
        value={formData.experience}
        onChange={(value) => setFormData({...formData, experience: value})}
      />

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Conditional Rendering
```typescript
<CETextInput
  label="Email"
  disabled={!isEditing}
  description={isEditing ? 'Edit your email' : 'Email cannot be changed'}
/>
```

### With Icons
```typescript
import {IconMail, IconUser} from '@tabler/icons-react';

<CETextInput
  label="Email"
  leftSection={<IconMail size={18} />}
/>

<CETextInput
  label="Username"
  leftSection={<IconUser size={18} />}
/>
```

---

## 🔀 Migration from Old Locations

Old import paths still work but are deprecated:

```typescript
// ❌ Old (still works, but deprecated)
import CETextInput from '@/shared/CETextInput';
import {ChipSelect} from '@/shared/ChipSelect';

// ✅ New (recommended)
import {CETextInput, CEChipSelect} from '@/shared/ce_ui';
```

---

## 📁 File Structure

```
src/components/
├── ce_ui/                           ← NEW: All UI components
│   ├── index.ts                     ← Barrel export
│   ├── CETextInput/
│   │   ├── CETextInput.tsx
│   │   ├── CETextInput.module.css
│   │   ├── index.tsx
│   │   └── README.md
│   ├── CETextArea/
│   │   ├── CETextArea.tsx
│   │   ├── CETextArea.module.css
│   │   └── index.ts
│   ├── CEDatePickerInput/
│   │   ├── CEDatePickerInput.tsx
│   │   ├── CEDatePickerInput.module.css
│   │   └── index.tsx
│   └── CEChipSelect/
│       ├── CEChipSelect.tsx
│       └── index.ts
│
├── CETextInput/                     ← Deprecated (re-export only)
├── CETextArea/                      ← Deprecated (re-export only)
├── CEDatePickerInput/               ← Deprecated (re-export only)
└── ChipSelect/                      ← Deprecated (re-export only)
```

---

## ✨ Tips & Best Practices

1. **Use barrel imports** - `import {...} from '@/shared/ce_ui'`
2. **Add descriptions** - Help users understand what to enter
3. **Use withAsterisk** - Mark required fields clearly
4. **Provide error messages** - Pass error text to display validation errors
5. **Test in dark mode** - All components support dark mode automatically
6. **Keep it simple** - Use defaults when possible

---

## 🐛 Troubleshooting

**Import not found?**
- Ensure path is correct: `@/shared/ce_ui`
- Check that files are in new location

**Styles not applied?**
- CSS modules are automatically scoped
- Check component is using `className` correctly

**ChipSelect not found?**
- It's now `CEChipSelect` in `ce_ui`
- Old `ChipSelect` imports still work via re-export

**TypeScript errors?**
- Ensure types are exported: `export type {CETextInputProps}`
- Check tsconfig includes new location (it does by default)

---

## 📚 Additional Resources

- Full documentation: `ce_ui/CETextInput/README.md`
- Migration details: `MIGRATION_SUMMARY.md`
- Mantine components: https://mantine.dev/

---

**Last Updated:** October 2024
**Status:** ✅ Ready to Use
**Breaking Changes:** ❌ None
