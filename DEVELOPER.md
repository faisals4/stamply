# Stamply — Developer Guide

Quick reference for common development tasks across the monorepo.

## Mobile App (Expo / React Native)

### Adding a New Screen

1. Create a new file in `mobile/app/` using kebab-case (e.g., `rewards.tsx`).
2. Expo Router auto-registers file-based routes — no manual route config needed.
3. For tab screens, add to `mobile/app/(tabs)/`.
4. For authenticated-only screens, add to `mobile/app/(auth)/`.
5. Create the screen component in `mobile/components/` or `mobile/business/screens/` (for merchant screens) using PascalCase.
6. The page file should be a thin wrapper that imports and renders the screen component:

```tsx
// mobile/app/my-feature.tsx
import { MyFeatureScreen } from '../components/my-feature/MyFeatureScreen';
export default function MyFeature() {
  return <MyFeatureScreen />;
}
```

### Adding a New Component

1. Shared UI primitives go in `mobile/components/ui/` (PascalCase).
2. Feature components go in `mobile/components/<feature>/` (e.g., `mobile/components/orders/`).
3. After adding, export from the folder's `index.ts` barrel file.
4. Merchant/business components go in `mobile/business/components/`.

### Adding Demo / Mock Data

1. Place mock data in `mobile/lib/demo/` (e.g., `mobile/lib/demo/my-feature-data.ts`).
2. Export from `mobile/lib/demo/index.ts`.
3. Components import from `../lib/demo/my-feature-data` — when the real API ships, just swap the import source.

## Web Dashboard (React + Vite)

### Adding a New Page

1. Create the page component in `web/src/pages/` (PascalCase).
2. Add the route in the router config (check `web/src/App.tsx` or router file).
3. Create feature components in `web/src/components/<feature>/`.

## Backend API (Laravel)

### Adding a New API Endpoint

1. Create a Controller: `php artisan make:controller Api/MyFeatureController`
2. Add the route in `api/routes/api.php`:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/my-feature', [MyFeatureController::class, 'index']);
});
```

3. Create a Form Request if needed: `php artisan make:request MyFeatureRequest`
4. Create a Resource for response shaping: `php artisan make:resource MyFeatureResource`

### Adding a Database Migration

```bash
cd api
php artisan make:migration create_my_table_table
php artisan migrate
```

## Translations (i18n)

### Adding a New Translation Key

1. Open `mobile/locales/ar.json` and `mobile/locales/en.json`.
2. Add the key in both files under the appropriate namespace:

```json
{
  "my_feature": {
    "title": "عنوان الميزة",
    "description": "وصف الميزة"
  }
}
```

3. Use in components:

```tsx
const { t } = useTranslation();
<Text>{t('my_feature.title')}</Text>
```

## Naming Conventions

| What               | Convention     | Example                     |
|--------------------|----------------|-----------------------------|
| Components (.tsx)  | PascalCase     | `HeaderBar.tsx`, `StoreCard.tsx` |
| Utilities (.ts)    | camelCase      | `auth.ts`, `colors.ts`      |
| Pages (app/)       | kebab-case     | `orders.tsx`, `for-business.tsx` |
| Folders            | kebab-case     | `components/stores/detail/`  |
| Types/Interfaces   | PascalCase     | `Store`, `ActiveOrder`       |
| Constants          | UPPER_SNAKE    | `ACTIVE_ORDERS`, `STORES`    |
| CSS/Tailwind       | NativeWind     | `className="flex-1 bg-page"` |

## Code Style Rules

- RTL-first: use `start`/`end` instead of `left`/`right` in styles and Tailwind classes.
- Colors: import from `lib/colors.ts` — never hardcode brand colors.
- Surfaces & Shadows: use `surfaces.card` and `shadows.card` from `lib/`.
- No console.log in production code — use proper error handling for `console.error`.
- Demo data stays in `lib/demo/` — never embed mock data in component files.
- Barrel exports: every component folder should have an `index.ts` exporting public items.

## Known Issues (File Naming)

The following files in `mobile/business/screens/` use PascalCase but should ideally be kebab-case. They are left as-is to avoid breaking imports:

- `MerchantDashboardScreen.tsx`, `MerchantCardsScreen.tsx`, `MerchantScannerScreen.tsx`
- `MerchantCustomersScreen.tsx`, `MerchantCustomerDetailScreen.tsx`
- `MerchantLocationsScreen.tsx`, `MerchantCardEditorScreen.tsx`
- `MerchantWebScreen.tsx`, `MerchantLoginSheet.tsx`, `MerchantSignupSheet.tsx`
- `ForBusinessScreen.tsx`

These should be renamed in a dedicated refactor PR with updated imports.
