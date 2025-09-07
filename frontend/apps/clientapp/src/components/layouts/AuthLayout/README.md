# AuthLayout - Mantine-Only Implementation

## Overview
The AuthLayout component is built entirely using Mantine components, following Mantine's design system and layout patterns. This approach ensures consistency with the rest of the application and reduces custom CSS maintenance.

## Key Features

### 1. **Pure Mantine Components**
- **Grid System**: Uses Mantine's responsive Grid for layout
- **Container & Stack**: Built-in spacing and alignment
- **Responsive Design**: Leverages Mantine's breakpoint system
- **Theme Integration**: Automatically inherits theme colors and spacing

### 2. **Responsive Layout**
- **Mobile**: Single column layout with optimized spacing
- **Desktop**: Two-column layout with illustration
- **Breakpoints**: Uses Mantine's standard breakpoint system (`xs`, `md`)

### 3. **Accessibility Built-in**
- **Semantic HTML**: Proper heading hierarchy with Title components
- **ARIA Support**: Built into Mantine components
- **Focus Management**: Handled by Mantine's focus system
- **Screen Reader**: Compatible through Mantine's accessibility features

### 4. **State Management**
- **Loading State**: Shows Mantine Loader component
- **Error State**: Changes title color to indicate errors
- **Progressive Enhancement**: Works without JavaScript

## Component Structure

```tsx
<Grid>                          // Main layout container
  <Grid.Col>                    // Content column
    <Container>                 // Content wrapper with padding
      <Stack>                   // Vertical spacing container
        <Box>                   // Brand section
          <TextLogo />
        </Box>
        
        <Stack>                 // Header section
          <Title />             // Page title
          <Text />              // Subtitle
        </Stack>
        
        {loading && <Loader />} // Loading state
        
        <Box>                   // Form wrapper
          <Stack>               // Form content
            {children}
          </Stack>
        </Box>
      </Stack>
    </Container>
  </Grid.Col>
  
  <Grid.Col>                    // Illustration column (desktop only)
    <Image />
  </Grid.Col>
</Grid>
```

## Props Interface

```tsx
interface AuthLayoutProps extends PropsWithChildren {
    title?: string;           // Main heading
    subtitle?: string;        // Supporting text
    loading?: boolean;        // Shows loader
    error?: boolean;          // Error state styling
    illustrationAlt?: string; // Image alt text
}
```

## Usage Examples

### Basic Login Form
```tsx
<AuthLayout
    title="Welcome back"
    subtitle="Sign in to your account"
>
    <LoginForm />
</AuthLayout>
```

### Loading State
```tsx
<AuthLayout
    title="Creating Account"
    subtitle="Please wait..."
    loading={true}
>
    <SignupForm />
</AuthLayout>
```

### Error State
```tsx
<AuthLayout
    title="Authentication Failed"
    subtitle="Please try again"
    error={true}
>
    <ErrorForm />
</AuthLayout>
```

## Benefits of Mantine-Only Approach

### 1. **Consistency**
- Follows Mantine's design system
- Automatic theme integration
- Consistent spacing and typography
- Standard component behavior

### 2. **Maintainability**
- No custom CSS to maintain
- Automatic updates with Mantine versions
- Consistent component API
- Built-in responsive behavior

### 3. **Performance**
- Smaller bundle size (no custom CSS)
- Optimized component rendering
- Automatic style deduplication
- Built-in optimization features

### 4. **Developer Experience**
- Familiar Mantine API
- TypeScript support out of the box
- IntelliSense and auto-completion
- Consistent prop patterns

### 5. **Accessibility**
- Built-in ARIA support
- Keyboard navigation
- Screen reader compatibility
- Focus management
- High contrast support

## Responsive Behavior

### Mobile (`< 768px`)
- Single column layout
- Centered content
- No illustration
- Optimized padding
- Touch-friendly spacing

### Desktop (`≥ 768px`)
- Two-column layout (50/50 split)
- Illustration on right side
- Larger spacing
- Better visual hierarchy

## Styling Customization

Since the component uses only Mantine components, styling can be customized through:

1. **Mantine Theme**: Global theme customization
2. **Component Props**: Built-in style props (`c`, `fw`, `ta`, etc.)
3. **Inline Styles**: For specific overrides
4. **CSS-in-JS**: Using Mantine's styling system

### Example: Custom Styling
```tsx
<AuthLayout
    title="Custom Title"
    subtitle="Custom subtitle"
>
    <Stack gap="md">
        <TextInput 
            variant="filled" 
            size="lg" 
        />
        <Button 
            fullWidth 
            size="lg" 
            variant="gradient" 
        />
    </Stack>
</AuthLayout>
```

## Migration Notes

### From Custom CSS Version
- **No Breaking Changes**: Same prop interface
- **Improved Performance**: Reduced bundle size
- **Better Consistency**: Automatic theme integration
- **Easier Maintenance**: No custom CSS to maintain

### Recommended Usage
1. Use Mantine's built-in spacing props (`p`, `m`, `gap`)
2. Leverage theme colors (`c="primary"`, `c="error"`)
3. Use responsive props where needed (`size={{base: 'sm', md: 'lg'}}`)
4. Follow Mantine's component patterns
