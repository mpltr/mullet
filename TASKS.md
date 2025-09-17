# Task Requirements

## Core Task Data Model Requirements

### Task Fields
```typescript
interface TaskType {
  id: string;
  title: string; // Required - main task description
  description?: string; // Optional - additional details
  status: 'pending' | 'in_progress' | 'completed'; // Task state management
  dueDate?: Date; // Optional - when task is due
  homeId: string; // Required - belongs to a home
  roomId?: string; // Optional - can be assigned to a specific room
  groupId?: string; // Optional - can be organized in groups
  assignedTo?: string; // Optional - can be assigned to specific user
  createdBy: string; // Required - user who created task
  createdAt: Date; // Required - creation timestamp
  completedAt?: Date; // Set when task is completed
  lastCompletedBy?: string; // Optional - user who last completed the task
  lastCompletedAt?: Date; // Optional - when task was last completed
  recurrenceDays?: number; // Optional - for recurring tasks
  nextDueDate?: Date; // For recurring tasks, next scheduled due date
}
```

## Home-Based Authorization Requirements

- **All task access is home-based**: Users can only access tasks from homes where they are members
- **Task creation**: Only home members can create tasks, and creator must be set to authenticated user
- **Task updates**: Any home member can update task status and details
- **Task deletion**: Only task creators can delete their own tasks
- **Security enforced at database level**: Firestore rules prevent unauthorized access

## Task Status Management Requirements

### Status States
- `pending`: Task not yet started
- `in_progress`: Task currently being worked on
- `completed`: Task finished

### Status Transitions
- Any home member can toggle task completion
- `completedAt` timestamp set when task marked complete
- `lastCompletedBy` and `lastCompletedAt` fields track who last completed the task and when
- Task creator tracking via `createdBy` field

### Recurring Task Behavior
- **Completion Logic**: When recurring task marked complete, keep status as `completed` and reschedule `dueDate` to next valid future date
- **Simple Scheduling**: Add `recurrenceDays` to current due date (not from original due date)
- **UI Display**: Show "Next scheduled: [date]" for completed recurring tasks vs "Due: [date]" for pending tasks
- **Daily Check**: On app load, automatically mark completed recurring tasks as `pending` if scheduled date has arrived
- **Undo Behavior**: Unchecking completed recurring task keeps current date, just changes status to pending

## Task Creation Form Requirements

### Required Fields
- Title (text input, required)

### Optional Fields
- Description (textarea, optional)
- Room assignment (dropdown, optional - "No specific room")
- **Group assignment (custom dropdown with integrated management)**:
  - Search/filter existing groups
  - Create new groups by typing name and pressing Enter or clicking "Create"
  - Delete groups via X button (visible on each group option)
  - "No group" option for ungrouped tasks
  - Click outside to close, keyboard navigation support
- Due date (date picker, optional)  
- Recurrence (number input in days, optional, only enabled when due date set)
- Assignment (user dropdown, optional - not currently implemented in form)

### Form Validation
- Title must be non-empty after trimming
- Recurrence requires due date to be set
- All other fields are optional

### Form Behavior
- Supports both create and edit modes
- Pre-populates fields when editing existing task
- Shows loading states during submission
- Handles optimistic updates with error rollback

## Task Display and UI Requirements

### Task Item Display
- Checkbox for completion toggle (green when complete)
- Task title (with strikethrough when completed)
- Optional description
- Due date with relative formatting ("Due Today", "Due Tomorrow", "Due in X days")
- Overdue visual indicators (red highlighting)
- Room tags when displayed in multi-room contexts (blue badge)
- **Group tags when group exists (purple badge)**
- **Orphaned group indicator when task has groupId but group deleted (gray "Ungrouped" badge)**
- **Completion tracking display**:
  - For completed non-recurring tasks: "Completed by [User Name]"
  - For completed recurring tasks: "Last completed by [User Name] on [Date]"
  - Uses user names fetched from user service instead of user IDs
- Recurrence indicators for recurring tasks (only show when completed and has recurrence)
- Edit and delete buttons (delete only for creators)

### Due Date Formatting Requirements
- "Due Today" for today
- "Due Tomorrow" for next day
- "Due Yesterday" for previous day
- "Due X days ago" for past dates
- "Due in X days" for future dates
- Month/day format for other dates
- Uses dayjs library for date formatting

### Task Organization
- Group by groups (with "ungrouped" section)
- Sort within groups by due date (no due date goes last)
- Visual grouping with headers
- Home-based filtering
- Client-side sorting (no orderBy in Firestore queries)

## Task Filtering and Views Requirements

### Filter Options
- "All" - show all tasks
- "Pending" - show non-completed tasks (`status !== 'completed'`)
- "Completed" - show only completed tasks (`status === 'completed'`)

### Grouping Requirements
- **Display ungrouped tasks first with home name header** (includes tasks with no groupId AND tasks with orphaned groupId)
- Display grouped tasks under group name headers (only for groups that still exist)
- Only show groups that contain tasks AND still exist in database
- **Orphaned group logic**: Tasks with deleted groupId are moved to "ungrouped" section automatically
- Empty states when no tasks match filter

### Real-time Updates
- Live sync across devices using Firestore listeners
- Automatic updates when tasks are created/updated/deleted
- Optimistic UI updates with error handling

## Task Hooks and Data Fetching Requirements

### Core Hooks
- `useTasks(userId)` - Get all tasks for user's homes with real-time updates
- `useTasksByHome(userId, homeId)` - Filter tasks for specific home
- `useTasksByRoom(userId, roomId)` - Filter tasks for specific room
- `useFilteredTasks(userId, filter)` - Apply status filters
- `useUsers(userIds)` - Fetch user information for displaying names in completion tracking

### Data Fetching Patterns
- Real-time listeners using `onSnapshot`
- Home membership validation before task queries
- Client-side sorting (no orderBy in Firestore queries)
- Error handling for permission denied scenarios

## Task Service Requirements

### CRUD Operations
- `create(homeId, title, createdBy, options?)` - Create new task
- `update(taskId, updates)` - Update task fields (handles field deletion)
- `updateStatus(taskId, status, completedBy?)` - Handle status changes, recurrence, and completion tracking
- `delete(taskId)` - Delete task (with completion history cleanup)
- `getByUser(userId)` - Fetch all user's tasks across homes

### Completion Tracking Logic
- When task status is set to 'completed', update `lastCompletedBy` and `lastCompletedAt` fields
- Store the userId of the person who completed the task for display purposes
- For recurring tasks, preserve completion tracking info when task is rescheduled
- Completion info persists until task is completed again by a different user or at a different time

### Recurring Task Logic
- Calculate next due date based on recurrence days
- Reset status to pending when recurring task completed
- Maintain completion timestamp for history
- Handle edge cases for non-recurring vs recurring tasks

## Task Completion History (Currently Disabled)

- Task completion tracking exists in schema but is currently disabled
- `TaskCompletionType` interface defined for future use
- Firestore rules prepared for completion history
- Service methods commented out pending discussion of "completion tracking nuances"

## Integration Requirements

### With Rooms
- Tasks can optionally belong to specific rooms
- Room information displayed in task lists
- Room deletion should handle associated tasks

### With Groups  
- Tasks can optionally belong to groups for organization
- Group-based display and filtering
- **Group Management**: On-the-fly creation and deletion of groups directly in task form
- **Orphaned Group Handling**: When groups are deleted, tasks keep their groupId references but display as "Ungrouped" in UI
- **No Database Cleanup**: Group deletion does NOT update associated tasks - orphaned references handled frontend-only

### With Users
- Tasks can be assigned to specific home members
- Creator tracking for permission management
- User information display in task assignments

## Empty States and Error Handling

### Empty States
- No homes: Prompt to create first home or show pending invitations
- No tasks: Contextual messages based on filter (completed vs pending)
- Loading states with spinners during data fetching

### Error Handling
- Permission denied handling for new users
- Optimistic updates with rollback on failure
- Console error logging with user-friendly messages
- Network error resilience

## Recent Clarifications and Changes

### Date Formatting (2025-01-13)
- Use dayjs library for date formatting instead of built-in formatters
- Show relative dates: "Due Today", "Due Tomorrow", "Due Yesterday"
- Only show recurrence text ("Every X days") when task is completed AND has recurrence

### Data Architecture (2025-01-13)
- Removed denormalized `authorizedUsers` fields from tasks
- Authorization now purely home-based through membership validation
- Stopped recording task completions (commented out for future discussion)
- Security rules updated to use home membership instead of user arrays

### Group Management Implementation (2025-01-13)
- **Custom GroupSelector Component**: Replaced basic dropdown with Keep Notes-style label selector
- **Integrated CRUD Operations**: Create, select, and delete groups all within single dropdown interface
- **Search and Filter**: Type to search existing groups or create new ones
- **Orphaned Reference Strategy**: Group deletion leaves task.groupId intact, UI handles missing groups gracefully
- **No Database Cleanup**: Simplified group deletion to avoid complex bulk updates and permission issues
- **Visual Indicators**: Purple badges for valid groups, gray "Ungrouped" for orphaned references

### Recurring Task System Redesign (2025-01-13)
- **Simple Scheduling Logic**: Replaced complex interval calculation with simple addition of recurrence days to current due date
- **Completion Without Reset**: Completed recurring tasks stay completed until scheduled date arrives
- **Daily Auto-Activation**: App load checks completed recurring tasks and reactivates those due today or overdue
- **Visual State Distinction**: "Next scheduled:" vs "Due:" labels distinguish completed vs pending recurring tasks
- **Predictable Undo**: Unchecking preserves current schedule date, no reversion to original due date
- **Example**: 14-day task due in 2 days → complete it → schedules for 16 days from now (2 + 14)