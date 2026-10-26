/*
 * Decides which screen to show for which address. A new screen needs a route
 * here, a line in WebConfig, and a permit line in SecurityConfig if logged-out
 * visitors may reach it.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import AccountsPage from "@/pages/AccountsPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<HomePage />} />

                {/* The account table. There is deliberately no owner-only wrapper on this route. */}
                <Route path="/accounts" element={<AccountsPage />} />

                {/* Anything unmatched goes to the home page. */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}