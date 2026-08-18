/*
 * Phase 2 Story 5: who you are signed in as, shown on both landing screens.
 *
 * WHY THIS IS ITS OWN COMPONENT
 *
 * Both landing screens show the same three facts in the same shape. Copying the
 * markup into both would mean a change to one of them silently applying to only
 * half the platform, which is the kind of difference nobody notices because each
 * screen is only ever seen by one kind of person.
 *
 * WHY IT IS STILL SHOWN AT ALL
 *
 * It began in Phase 2 Story 4 as proof that a session had really started rather
 * than the screen merely having navigated away from the login page, and it still
 * earns its place that way. Seeing the right person name here means the server
 * read the account out of the database for this session.
 */
import type { CurrentUser } from "@/lib/currentUser";

/*
 * user - the account that /api/me answered with.
 *
 * A description list rather than a table or a set of paragraphs. It is the
 * element meant for pairs of a label and its value, so screen readers announce
 * "Username, owner" rather than reading two unrelated pieces of text in a row.
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
