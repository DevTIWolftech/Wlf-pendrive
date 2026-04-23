# Security Specification for WLF PENDRIVE (Multi-Tenant)

## Data Invariants
1. **Identity Integrity**: All documents (`clients`, `pendrives`, `rentals`, `transactions`) MUST have an `ownerId` that matches the authenticated user ID.
2. **Access Control**: Users can only perform CRUD operations on documents where `ownerId == request.auth.uid`.
3. **Immutability**: The `ownerId` field cannot be modified after creation.
4. **Ownership Enforcement**: `allow list` and `allow get` must strictly verify `resource.data.ownerId == request.auth.uid`.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **The Hijack**: Create a client with `ownerId: "someone_else_uid"`.
2. **The Peek**: Querying `rentals` without an `ownerId` filter (should be filtered by rule).
3. **The Shadow Field**: Adding `isAdmin: true` to a client profile.
4. **The Spoof**: Updating a pendrive that belongs to another user.
5. **The Orphan**: Deleting a client that still has active rentals (Relational logic, if implemented).
6. **The Time Warp**: Setting `createdAt` to a future date.
7. **The Negative Price**: Creating a rental with `price: -100`.
8. **The ID Injection**: Using a 1MB string as a document ID.
9. **The Overwrite**: Attempting to change `ownerId` of an existing document.
10. **The PII Leak**: Authenticated user trying to `get()` a user profile that isn't theirs.
11. **The Batch bypass**: Atomic write where one operation skips `ownerId` check.
12. **The Zero-Trust Bypass**: `allow read: if isSignedIn()` (This app requires `ownerId` check).

## Verification Strategy
- Final `firestore.rules` will be linted and tested.
