import { Task } from './task';

export enum MilestoneStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum GoalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  category: string;
  targetDate?: string;
  completedAt?: string;
  progress: number;
  userId: string;
  milestones: Milestone[];
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  isDeleted: boolean;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  targetDate?: string;
  completedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  isDeleted: boolean;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  priority?: GoalPriority;
  category?: string;
  targetDate?: string;
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  category?: string;
  targetDate?: string;
  progress?: number;
  completedAt?: string;
}

export interface CreateGoalMilestoneData {
  title: string;
  description?: string;
  targetDate?: string;
  dueDate?: string;
  startDate?: string;
  order?: number;
}

export interface UpdateGoalMilestoneData {
  title?: string;
  description?: string;
  status?: MilestoneStatus;
  targetDate?: string;
  dueDate?: string;
  startDate?: string;
  order?: number;
}

export interface AIPlanRequest {
  goalId: string;
  promptOptions?: {
    intensity?: 'low' | 'medium' | 'high';
    weeklyHours?: number;
    language?: 'en' | 'ar';
    tone?: 'supportive' | 'professional' | 'casual';
  };
}

export interface GeneratedPlan {
  milestones: GeneratedMilestone[];
  tasks: GeneratedTask[];
  notes?: string;
}

export interface GeneratedPlanResult {
  plan: GeneratedPlan;
  milestones: Milestone[];
  tasks: Task[];
}

export interface GeneratedMilestone {
  title: string;
  durationDays: number;
  description?: string;
  tasks: string[];
}

export interface GeneratedTask {
  title: string;
  milestoneIndex: number;
  dueOffsetDays: number;
  durationMinutes: number;
  recurrence?: string;
  description?: string;
}
