## Project Structure & Coding Standards

### Directory Layout

```
src/
├── components/        # React components
├── hooks/             # Custom React hooks
├── libs/              # Core libraries and utilities
├── loaders/           # Data fetching functions
├── pages/             # Next.js pages
├── styles/            # Global styles
├── types/             # TypeScript type definitions
└── utils/             # Helper functions and utilities
```

### Components

#### Naming Conventions

- **PascalCase** for all component files: `Button.tsx`, `Navigation.tsx`
- **Prefix-based grouping** for related components:
  - `Button.tsx`, `ButtonBurger.tsx`, `ButtonMenu.tsx`
  - `Image.tsx`, `MenuBurger.tsx`, `Navigation.tsx`
- **View components** follow `View[Name]` pattern:
  - `ViewHome/`, `ViewApp/`
  - Every page has a corresponding View component

#### Nesting Patterns

- **Simple components**: Flat files at root level (`Button.tsx`, `Navigation.tsx`)
- **Complex components**: Own directory with multiple files
  ```
  components/
  ├── Button.tsx                    # Simple component
  ├── Navigation.tsx                # Simple component
  ├── ViewHome/                     # Complex View component
  │   ├── ViewHome.tsx             # Main component
  │   ├── HomeStats.tsx            # Sub-component (not reused)
  │   ├── HomeMatches.tsx          # Sub-component (not reused)
  │   ├── types.ts                 # Component-specific types
  │   └── utils.ts                 # Component-specific utilities
  └── ButtonBurger.tsx             # Reusable component (moved to root)
  ```
- **Small sub-components**: Live in parent directory if not reused elsewhere
- **Reusable components**: Move to root level when used by multiple parents
- **Logic abstraction**: Extract complex logic to small, testable utility functions
  - Component-specific utils stay in component directory (`utils.ts`)
  - Reusable utils move to `/utils` directory

#### Styling

- **Tailwind CSS** for all styling
- **Inline styles** only when Tailwind cannot provide a solution (e.g., colors from an API)

**Fonts:**

The project uses Geist as the primary font system:

- **Primary font (Geist)**: Default font for the entire application, accessible via `font-sans` (applied by default)
- **Available weights**: Supports multiple weights including light, normal, medium, semibold, bold
- **Global availability**: Font works throughout the app, including in modals (via CSS variables)

```tsx
// Primary font (Geist) - default
<h1 className="text-2xl font-bold">Main heading</h1>

// Different font weights
<p className="text-sm font-light">Light text</p>
<span className="font-semibold">Semibold text</span>
```

**Custom Tailwind Extensions:**

- **Extended typography**: Additional font sizes (`text-2xs`, `text-3xs`, `text-4xs`) for fine-grained control
- **Component-specific utilities**: Grid templates for cards, filters, and layout components

**Usage Examples:**

```tsx
// Extended typography
<span className="text-3xs leading-3xs">Small text</span>

// Standard responsive grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <div>Content</div>
</div>
```

#### Structure

- **Direct imports** using full component paths: `import { Button } from '@/components/Button'`

#### Types

**Component Props:**

- **Props interfaces**: `[ComponentName]Props` pattern (`ViewHomeProps`, `NavigationProps`)
- **Return types**: `[FunctionName]ReturnType` for hook/utility returns (`ManageOpenStateReturnType`)
- **Filter types**: `[Domain]FilterType` or `[Domain]FiltersType` (`HouseFiltersType`, `TaskFilterType`)
- **Reducer actions**: `[Domain]ReducerAction` (`TaskFilterReducerAction`)

**Props with Global Data:**

```typescript
// Component props extending global props
interface ViewHomeProps extends GlobalDataPropsType {
  getHouseListResponse: GetHouseListResponseType;
  getTaskListResponse: GetTaskListResponseType;
  // ... additional specific props
}
```

**Filter State Types:**

```typescript
// Use union types for constrained values
export type TaskFilterType = {
  completed: boolean;
  houseIds: string[];
  limit: "0" | "5" | "10" | "all";
  assignedTo: "me" | "others" | "all";
  // ...
};
```

### Hooks

#### Naming Conventions

- **Descriptive naming** with `use` prefix: `useFilter.ts`, `useQueryParams.ts`
- **PascalCase** for the hook function: `useIsMounted`, `useShouldAnimate`

#### Structure

- **Flat files** at root level - hooks are typically simple
- **Direct imports** using full hook paths: `import { useIsMounted } from '@/hooks/useIsMounted'`
- **Logic abstraction** encouraged - keep hooks focused and testable

#### Types

**Hook Parameters:**

- **Generic constraints**: Use TypeScript generics for flexible, reusable hooks
- **Return type interfaces**: Define clear return shapes for complex hooks

**Example patterns:**

```typescript
// Generic hook with typed constraints
export function useFilter<T>(initialFilters: T) {
    // Returns structured object with typed methods
    return {
        filters: T,
        resetFilters: (newFilters: T) => void,
        setFilters: (updatedFilters: Partial<T>) => void,
    }
}

// Hook with specific return type
export function useIsMounted(): boolean
export function useShouldAnimate(): boolean

```

#### Key Hooks

**useStateArray**

Manages array state with unique values using Set internally. Provides methods for adding, removing, toggling, and clearing array items.

**useStateArrayWithStorage**

Same functionality as useStateArray but persists to localStorage/sessionStorage. Syncs via the StorageEvent to maintain consistency across browser tabs, windows and hook instances.

### Libs

#### Purpose

- **Application agnostic** libraries that contain no project-specific logic
- **Portable** - can be copied to another project and reused without modification
- **Self-contained** utilities for common functionality (fetch, validation, analytics, etc.)

#### Structure

- **Flat files** at root level with descriptive names
- **Individual README** in `/libs` directory explains each library's purpose and usage

### Loaders

The loader system provides a unified way to fetch data from both the API and CMS across server-side and client-side contexts.

#### File Structure

Loaders are organized in the following structure (use the CLI tools to generate them):

```
src/loaders/
├── index.ts                 # Barrel file (auto-updated)
├── simpleLoader.ts          # Flat file loader
└── complexEndpoint/         # Directory-based loader
    ├── complexEndpoint.ts   # Main loader file
    └── types.ts             # Separate types file (optional)
```

#### How Loaders Work

Loaders are functions that return an object with two properties:

- `key`: A unique identifier for the loader (used for caching and parallel requests)
- `loader`: A function that performs the actual data fetching

#### Available Hosts

- **API**: Backend data using `fetchDataApi()`

_Note: Additional hosts can be configured in `cli.config.json` at the frontend root._

#### Server-Side Usage (getServerSideProps)

```typescript
import { fetchAll, getHouseList, getHouse } from "@/loaders";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Single loader
  const data = await fetchAll([getHouseList({ userId: "123" })]);

  // Multiple loaders in parallel
  const data = await fetchAll([
    getHouseList({ userId: "123" }),
    getHouse({ id: "456" }),
  ]);

  return {
    props: {
      ...data, // Contains: getHouseListResponse, getHouseResponse
    },
  };
};
```

#### Client-Side Usage (useLoader Hook)

```typescript
import { useLoader, getTaskStats } from "@/loaders";

function Component() {
  const { data, loading, error, load } = useLoader(
    getTaskStats,
    {},
    { proxy: true }
  );

  // Trigger loading
  const handleLoad = () => {
    load({ houseId: "123" });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

#### Proxy System

Client-side requests are proxied through the Next.js server to handle CORS:

- API requests: `/api-proxy/*` → `${process.env.API}/*`

The `useLoader` hook automatically sets `proxy: true` in fetch options. Proxies are configured in `next.config.mjs`.

#### Response Types

All loaders return a standardized response format with guaranteed non-null data:

```typescript
interface FetchDataResponseType<T> {
  data: T;
  success: boolean;
  statusCode: number;
  message: string;
}
```

The `fetchDataApi()` and `fetchDataNextjsApi()` functions automatically handle mapping from the API response format to this standardized structure, and apply appropriate fallbacks when the API returns null data or requests fail. This ensures consistent data handling and eliminates the need for null checks in components.

#### Types

**Loader Type Patterns:**

- **Data types**: `Get[Entity][Action]DataType` for the actual data structure
- **Response types**: `Get[Entity][Action]ResponseType` for the standardized API response
- **Query parameters**: `Get[Entity][Action]QueryParamsType` for request parameters
- **Additional parameters**: `Get[Entity][Action]AdditionalParamsType` for loader configuration

**Examples:**

```typescript
// Data structure from API
export type GetHouseListDataType = HouseType[];

// Standardized response wrapper
export type GetHouseListResponseType =
  FetchDataResponseType<GetHouseListDataType>;

// Query parameters for the request
interface GetHouseListQueryParamsType {
  // Optional query parameters
}

// Additional loader configuration
interface GetHouseListAdditionalParamsType {
  // Additional non-query parameters
}
```

**Domain Entity Types:**

- **Main entities**: `[Entity]Type` suffix (`HouseType`, `TaskType`, `RoomType`)
- **Collections**: `[Entity]EntityType` when part of larger structures (`TasksEntityType`)
- **Extended data**: `[Entity]ExpandedType` for enhanced versions with additional data (`HouseDataExpandedType`)

### Pages

#### Purpose

- **Routing only** - handle Next.js routing and `getServerSideProps`
- **Re-export View components** - pages simply import and re-export the corresponding View component
- **No component logic** - all UI logic belongs in View components
- **Data fetching** - use loaders to fetch data server-side
- **Generated via CLI** to create pages with corresponding View components

#### Types

**Page Component Types:**

- **Page exports**: Simply re-export View components (no additional props needed)
- **GetServerSideProps**: Leverage loader response types for type safety, props flow directly to View component

**Examples:**

```typescript
// Page simply re-exports the View component
import { ViewHome } from '@/components/ViewHome/ViewHome';
export default ViewHome;

// Or with HOCs (authentication, etc.)
import { withAuth } from '@/components/withAuth';
import { ViewHome } from '@/components/ViewHome/ViewHome';
export default withAuth(ViewHome);

// GetServerSideProps with typed loader responses
export const getServerSideProps: GetServerSideProps = async (context) => {
  const data = await fetchAll([getHouseList(), getRoomList()]);

  return {
    props: {
      ...data, // Contains typed loader responses
    },
  };
};
```

### Styles

#### Purpose

- **Global styles** loaded in the `_app` file
- **Application-wide** CSS and styling configuration

### Types

#### Purpose

- **Common types** shared across the application
- **Domain-based** organization by feature area

#### Organization Patterns

**Location Strategy:**

- **Co-located first**: Types start alongside their usage in the same file or a local `types.ts`
- **Promote when shared**: Move to central `/types` directory when used across multiple areas
- **Domain-based files**: Group related types by feature area (`bet.ts`, `match.ts`, `market.ts`)

**File Structure:**

```
src/types/
├── index.ts           # Barrel exports + common UI types
├── house.ts          # House data and member types
└── task.ts           # Task and room types
```

**Component-specific types:**

```
components/ViewHome/
├── ViewHome.tsx
├── types.ts          # Component-specific types
└── utils.ts

components/Navigation/
├── Navigation.tsx
└── types.ts          # Component-specific types
```

### Utils

#### Purpose

- **Common utilities** shared across the application
- **Helper functions** for data transformations and reusable logic

#### Types

**Utility Function Types:**

- **Domain-specific**: Group utility types by domain area (`string.ts`, `match.ts`, `player.ts`)
- **Function parameters**: Use descriptive parameter interface names for complex utilities
- **Return types**: Define clear return types for utility functions

**Examples:**

```typescript
// Domain-specific utility types
export function toKebabCase(text: string): string;
export function replaceSpecialChars(str: string): string;

// Complex utility with parameter interface
interface ObjectToQueryParamsOptions {
  encode?: boolean;
  includeEmpty?: boolean;
}
export function objectToQueryParams(
  obj: Record<string, any>,
  options?: ObjectToQueryParamsOptions
): string;
```
