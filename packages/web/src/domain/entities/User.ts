export enum UserRole {
    ADMIN = 'ADMIN',
    CHEF = 'CHEF',
    STAFF = 'STAFF',
}

export interface UserProps {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export class User {
    constructor(private readonly props: UserProps) { }

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

    isAdmin(): boolean {
        return this.props.role === UserRole.ADMIN;
    }

    toJSON(): UserProps {
        return { ...this.props };
    }
}
