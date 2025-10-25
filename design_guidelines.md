# Design Guidelines: Telegram Corporate Notification Bot

## Design Approach

**Selected Approach:** Design System - Material Design with Telegram Mini App Adaptations

**Justification:** This is a utility-focused enterprise tool prioritizing efficiency, clarity, and rapid information processing. The admin panel needs to be immediately usable without training, with clear hierarchies for critical actions (posting company-wide alerts).

**Key Principles:**
- **Clarity over creativity** - IT emergencies require zero ambiguity
- **Speed of action** - Admins must publish alerts in under 30 seconds
- **Mobile-first** - Telegram Mini Apps are primarily mobile experiences
- **Telegram ecosystem consistency** - Align with Telegram's visual language

---

## Typography

**Font Stack:**
- Primary: SF Pro Display (iOS) / Roboto (Android) - system fonts for optimal Mini App performance
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

**Scale:**
- Hero/Alert Headers: 24px (font-bold)
- Section Headers: 18px (font-semibold)
- Body Text: 16px (font-normal)
- Secondary/Meta: 14px (font-normal)
- Button Text: 16px (font-medium)

**Hierarchy:**
- Department names: font-semibold
- Alert messages: font-normal with generous line-height (1.6)
- Status indicators: font-medium, uppercase tracking-wide

---

## Layout System

**Spacing Primitives:** Tailwind units of 3, 4, 6, and 8
- Micro spacing: p-3, gap-3
- Standard component padding: p-4, p-6
- Section spacing: py-8, mb-8
- Touch targets: min-h-12 (48px minimum)

**Grid Structure:**
- Single column layout for mobile-first (max-w-2xl container)
- Full-width sections within Telegram Mini App viewport
- Consistent 16px (p-4) horizontal padding throughout

---

## Component Library

### Navigation & Structure
**Admin Panel Header:**
- Fixed top bar with app title "Панель управления уведомлениями"
- User department badge (right-aligned)
- Height: h-14 with shadow-sm

**Tab Navigation (if needed):**
- Segmented control style: "Создать пост" | "История"
- Rounded-lg with smooth transitions

### Department Selection
**Multi-select Checkboxes:**
- Large touch targets (min-h-12)
- Checkbox + department name + member count
- "Выбрать все" toggle at top
- Clear visual distinction between selected/unselected states

**Department List Item:**
```
[✓] Департамент информационных технологий (12)
[ ] Департамент продаж (45)
```
- Rounded-lg borders
- Generous padding (p-4)
- Stacked vertically with gap-3

### Message Composition
**Textarea for Alert Message:**
- Full-width with rounded-lg border
- Minimum height: min-h-48
- Placeholder: "Опишите ситуацию подробно..."
- Character counter at bottom-right
- Auto-expanding based on content

### Action Buttons
**Primary CTA (Publish):**
- Full-width at bottom
- Height: h-12
- Rounded-lg
- Clear label: "Опубликовать уведомление"
- Disable state when no departments selected

**Secondary Actions:**
- Outline style
- Smaller footprint
- Labels: "Предпросмотр", "Отмена"

### Bot Message Interface (Native Telegram)
**Welcome Message:**
- Structured text with emojis for visual breaks
- Bold headers for sections
- Line breaks for readability

**Department Selection (Inline Keyboard):**
- 2-column grid on mobile
- 3-column on tablet
- Each button: department name (may wrap to 2 lines)
- Callback data structure: dept_[id]

**Admin Control Panel:**
- "➕ Создать пост" button (green accent)
- "⚙️ Настройки" button
- "📊 Статистика" button (if needed)
- Vertical stack with gap-2

### Status & Feedback
**Success Confirmation:**
- Green checkmark icon
- Clear success message
- Auto-dismiss after 3 seconds or manual close

**Alert Preview Card:**
- Light background
- Border-l-4 accent
- Department badges at top
- Message preview
- Timestamp

---

## Telegram Mini App Specific

**Viewport Management:**
- Use Telegram's viewport API: `window.Telegram.WebApp.expand()`
- No fixed viewport heights - let content flow naturally
- Safe area insets for iOS notch

**Telegram Native Elements:**
- Use `MainButton` API for primary actions instead of HTML buttons when possible
- Leverage `HapticFeedback` for tactile responses on selections
- Implement `BackButton` for navigation hierarchy

**Theme Integration:**
- Respect Telegram's theme (light/dark mode)
- Use Telegram's color scheme variables when available
- Ensure high contrast for critical alerts

---

## Animations

**Minimal & Purposeful:**
- Page transitions: Simple fade (150ms)
- Checkbox toggle: Scale bounce (100ms)
- Success states: Gentle scale + fade-in (200ms)
- NO scroll-triggered animations
- NO decorative motion

---

## Accessibility

**Touch Targets:**
- All interactive elements: min-h-12 (48px)
- Adequate spacing between touch zones (gap-3 minimum)

**Readability:**
- High contrast text (WCAG AA minimum)
- Sufficient line-height for body text (1.6)
- Clear focus states for keyboard navigation

---

## Content Strategy

**Alert Message Best Practices:**
- Start with severity level (🔴 Критично | 🟡 Внимание | 🟢 Информация)
- What happened (1 sentence)
- Impact (who/what affected)
- Expected resolution time
- Contact for questions

**Department Labels:**
- Full department names (no abbreviations except "HR")
- Display member count for admin context
- Alphabetical ordering

---

## Summary

This design creates a **fast, unambiguous notification system** where IT admins can broadcast critical alerts in under 30 seconds. The interface prioritizes clarity and speed over visual flourish, with generous touch targets and zero visual distractions. The Telegram Mini App integrates seamlessly with Telegram's native UI while maintaining corporate professionalism for enterprise use.