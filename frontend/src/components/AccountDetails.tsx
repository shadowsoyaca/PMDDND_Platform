/*
 * The signed-in account's username, name and role, shown as a description
 * list on both landing screens.
 */
import type { CurrentUser } from "@/lib/currentUser";

/**
 * Draws the three account facts as label and value pairs.
 *
 * @param user (CurrentUser) the account that /api/me answered with.
 */
export default function AccountDetails({ user }: { user: CurrentUser }) {
    return (
        <dl className="mb-8 space-y-3">
            <div>
                <dt className="text-sm text-slate-500">Username</dt>
                <dd className="text-slate-900">{user.username}</dd>
            </div>
            <div>
                <dt className="text-sm text-slate-500">Name</dt>
                <dd className="text-slate-900">{user.personName}</dd>
            </div>
            <div>
                <dt className="text-sm text-slate-500">Role</dt>
                <dd className="text-slate-900">{user.role}</dd>
            </div>
        </dl>
    );
}
