/*
 * Phase 2 Story 4: decides which screen to show for which address.
 *
 * React draws its screens in the browser. There is only ever one real file,
 * index.html, and this file is what reads the address in the bar and picks the
 * matching screen. Nothing here talks to the server.
 *
 * HOW THIS PAIRS WITH THE BACKEND
 *
 * These routes are only half the arrangement. Two other places have to agree:
 *
 *   SecurityConfig decides who is allowed to reach an address at all. A
 *   logged-out visitor asking for anything other than the login screen is sent
 *   to the login screen before this file is ever consulted, which is what makes
 *   the login screen the only thing an unauthenticated visitor can see.
 *
 *   WebConfig makes the address survive being typed in or reloaded. Without it,
 *   Spring would look for a file named /login, find none, and answer 404. It
 *   forwards to index.html instead, which loads the app, which brings the
 *   browser here.
 *
 * ADD A ROUTE IN THREE PLACES when a new screen is added: here, in WebConfig so
 * the address can be reloaded, and in SecurityConfig only if logged-out visitors
 * should be able to reach it. Forgetting the WebConfig line has a distinctive
 * symptom worth recognising: clicking through to the screen from inside the app
 * works, but typing its address or pressing reload gives a 404.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
// NOTE: Phase 2 Story 5 - the account table.
import AccountsPage from "@/pages/AccountsPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<HomePage />} />

                {/*
                 * NOTE: Phase 2 Story 5 - the account table. The matching
                 * WebConfig line is already in place, so this address survives
                 * being typed in or reloaded.
                 *
                 * There is no owner-only wrapper around this route on purpose.
                 * Any signed-in person can reach the screen; the screen asks the
                 * server for the accounts and draws the refusal when it is turned
                 * down. Deciding it here instead would mean the browser judging
                 * its own permissions, which is a judgement it cannot be trusted
                 * to make.
                 */}
                <Route path="/accounts" element={<AccountsPage />} />

                {/*
                 * Anything else goes to the home page. This is a safety net
                 * rather than a real rule: a logged-out visitor never gets here,
                 * because SecurityConfig has already sent them to the login
                 * screen. It only catches a signed-in player typing an address
                 * that does not exist yet.
                 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}