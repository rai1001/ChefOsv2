export enum UserRole {
  ADMIN = 'admin',
  CHEF = 'chef',
  STAFF = 'staff',
}

export interface UserProps {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  active: boolean;
  allowedOutlets: string[];
  activeOutletId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get photoURL(): string | undefined {
    return this.props.photoURL;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get active(): boolean {
    return this.props.active;
  }

  get allowedOutlets(): string[] {
    return this.props.allowedOutlets;
  }

  get activeOutletId(): string | undefined {
    return this.props.activeOutletId;
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  toJSON(): UserProps {
    return { ...this.props };
  }
}
