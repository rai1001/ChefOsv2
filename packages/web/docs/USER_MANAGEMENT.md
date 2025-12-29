# User Management System Documentation

## Overview

The User Management system in ChefOS v2 handles authentication, user roles, outlet access, and invitation flows using Clean Architecture principles.

## Architecture

### Usage

- **Hook**: `useUserManagement` (Presentation Layer)
- **Use Cases**: `InviteUserUseCase`, `UpdateUserUseCase`, `ListUsersUseCase`, etc. (Application Layer)
- **Repository**: `FirestoreUserRepository` (Infrastructure Layer) implementation of `IUserRepository`.
- **Entities**: `User`, `UserRole`, `Invitation`.

### Key Components

#### Authentication

- **Provider**: Firebase Auth.
- **State**: Managed via `userAtom` (Jotai) and `AuthStateListener`.

#### Roles

Supported roles (defined in `UserRole`):

- `admin`: Full access.
- `chef`: Kitchen management.
- `staff`: Basic access.

### Features

#### Inviting Users

1. **Admin** navigates to **Admin Panel > Users**.
2. Clicks **"Invitar Usuario"**.
3. Enters email, role, and allowed outlets.
4. System creates an `Invitation` document in Firestore (`invitations` collection).
5. Cloud Function (`onInvitationCreated`) sends an email with a magic link.
6. The link points to `/accept-invitation?token=...`.

#### Accepting Invitations

1. User clicks the link.
2. Lands on `AcceptInvitationPage`.
3. Enters their name and password.
4. System validates the token.
5. On success:
   - Validates the invitation logic matches the email.
   - Creates the user in Firebase Auth.
   - Creates the user profile in Firestore (`users` collection).
   - Marks invitation as accepted/deleted.

#### Managing Users

- **Edit**: Admins can change roles and allowed outlets.
- **Deactivate**: Users can be deactivated (preventing login/access) without deletion.
- **Delete**: Permanent removal (requires safeguards against deleting the last admin).

## Troubleshooting

### Common Issues

#### "Permission Denied"

- Check Firestore Security Rules.
- Ensure the user has `role: admin` in their Firestore document.
- Verify the user is authenticated.

#### Invitation Email Not Received

- Check Cloud Functions logs for `sendInvitationEmail`.
- Verify the email address is correct.
- Check spam folder.

#### "Invalid Token"

- Tokens (invitations) might have expired or been deleted.
- Ensure the user is not already registered with that email.

## Setup & Testing

- Run unit tests: `npm test src/test`
- Manual validation: Use the Admin Panel UI.
