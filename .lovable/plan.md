I will update the visual design of the application to follow a "fintech" aesthetic, characterized by a refined dark theme, sophisticated gradients, subtle borders, and improved typography.

### Technical Details

- **Tailwind Configuration**:
  - Update `tailwind.config.ts` to include a custom palette with more balanced dark tones.
  - Refine `borderRadius` to `12px` (0.75rem) for a more modern, premium feel.
  - Add "fintech-blue" and "fintech-purple" as accent colors.
- **Global CSS (`index.css`)**:
  - Update CSS variables for a deep charcoal/navy background (`#0A0C10` range).
  - Implement subtle "glassmorphism" effects for cards and headers.
  - Update the scrollbar to be more discreet.
- **UI Components**:
  - **Button**: Update `button.tsx` with subtle transitions and cleaner padding.
  - **AppLayout**: Add a subtle background gradient or grain effect to enhance depth.
  - **HomeDashboard**: Update card layouts to use the new "fintech" style with improved spacing and iconography.
- **Typography**: Ensure the application uses "Geist" (already in config) consistently with optimized tracking and leading.

### Visual Changes

- **Background**: Shift from pure black/dark gray to a deep navy/slate charcoal.
- **Accents**: Maintain the primary yellow but complement it with subtle blue/purple gradients for a professional financial look.
- **Cards**: Add inner borders and very subtle shadows to create a layered "stack" effect.
- **Animations**: Add smooth, subtle fade-ins for content loading.
